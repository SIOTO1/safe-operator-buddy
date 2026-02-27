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
