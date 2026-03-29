import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BOOKINGS_PER_HOUR = 3;
const MAX_BOOKINGS_PER_DAY = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Basic server-side validation
    const {
      customer_name,
      customer_email,
      customer_phone,
      event_date,
      event_time,
      event_end_time,
      event_location,
      equipment,
      special_requests,
      guest_count,
    } = body;

    if (
      !customer_name ||
      typeof customer_name !== "string" ||
      customer_name.trim().length < 2 ||
      customer_name.length > 100
    ) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !customer_email ||
      typeof customer_email !== "string" ||
      !emailRegex.test(customer_email) ||
      customer_email.length > 255
    ) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!event_date || !event_location || !Array.isArray(equipment) || equipment.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limiting: check recent submissions by this email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: hourlyCount } = await supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("customer_email", customer_email.trim().toLowerCase())
      .gte("created_at", oneHourAgo);

    if ((hourlyCount ?? 0) >= MAX_BOOKINGS_PER_HOUR) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please wait before submitting again.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { count: dailyCount } = await supabase
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("customer_email", customer_email.trim().toLowerCase())
      .gte("created_at", oneDayAgo);

    if ((dailyCount ?? 0) >= MAX_BOOKINGS_PER_DAY) {
      return new Response(
        JSON.stringify({
          error: "Daily submission limit reached. Please try again tomorrow.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert the booking
    const { error: insertError } = await supabase
      .from("booking_requests")
      .insert({
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim().toLowerCase(),
        customer_phone: customer_phone?.trim() || null,
        event_date,
        event_time: event_time || null,
        event_end_time: event_end_time || null,
        event_location: event_location.trim(),
        equipment,
        special_requests: special_requests?.trim() || null,
        guest_count: guest_count || null,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit booking" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send booking confirmation email to customer
    const emailData = {
      customer_name: customer_name.trim(),
      event_date,
      event_time: event_time || undefined,
      event_end_time: event_end_time || undefined,
      event_location: event_location.trim(),
      equipment,
      special_requests: special_requests?.trim() || undefined,
    };

    try {
      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          idempotency_key: `booking-confirm-${crypto.randomUUID()}`,
          message_id: crypto.randomUUID(),
          to: customer_email.trim().toLowerCase(),
          from: "SIOTO <noreply@notify.sioto.com>",
          sender_domain: "notify.sioto.com",
          subject: `Booking Confirmation — ${event_date}`,
          html: `<p>Hey ${customer_name.trim()}! Your booking request for ${event_date} at ${event_location.trim()} has been received. We'll review it and get back to you within 24 hours.</p><p>Equipment: ${equipment.join(", ")}</p>`,
          purpose: "transactional",
          label: "booking_confirmation",
          queued_at: new Date().toISOString(),
        },
      });

      // Send owner notification — scoped: if booking has company_id, only notify that company's owners
      // For unscoped bookings (no company_id), notify the first owner found (legacy behavior)
      const { data: theBooking } = await supabase
        .from("booking_requests")
        .select("id, company_id")
        .eq("customer_email", customer_email.trim().toLowerCase())
        .eq("event_date", event_date)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let ownerQuery = supabase
        .from("profiles")
        .select("email, user_id")
        .not("email", "is", null);

      if (theBooking?.company_id) {
        ownerQuery = ownerQuery.eq("company_id", theBooking.company_id);
      }

      const { data: ownerProfiles } = await ownerQuery.limit(50);

      if (ownerProfiles) {
        for (const profile of ownerProfiles) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .eq("role", "owner")
            .maybeSingle();

          if (roleData && profile.email) {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                idempotency_key: `booking-owner-${crypto.randomUUID()}`,
                message_id: crypto.randomUUID(),
                to: profile.email,
                from: "SIOTO <noreply@notify.sioto.com>",
                sender_domain: "notify.sioto.com",
                subject: `New Booking: ${customer_name.trim()} — ${event_date}`,
                html: `<p>New booking from ${customer_name.trim()} (${customer_email.trim().toLowerCase()}) for ${event_date} at ${event_location.trim()}.</p><p>Equipment: ${equipment.join(", ")}</p><p>Log in to review.</p>`,
                purpose: "transactional",
                label: "owner_notification",
                queued_at: new Date().toISOString(),
              },
            });
            break; // Only notify first owner
          }
        }
      }
    } catch (emailErr) {
      console.error("Email send error (non-blocking):", emailErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
