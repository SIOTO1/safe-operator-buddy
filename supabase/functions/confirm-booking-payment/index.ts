import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ status: "unpaid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if already processed (idempotency)
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ status: "already_processed", payment_id: existingPayment.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = session.metadata || {};
    const customerName = meta.customer_name || "Customer";
    const customerEmail = meta.customer_email || "";
    const customerPhone = meta.customer_phone || null;
    const eventDate = meta.event_date || "";
    const startTime = meta.start_time || null;
    const endTime = meta.end_time || null;
    const eventLocation = meta.event_location || "";
    const notes = meta.notes || null;
    const subtotal = parseFloat(meta.subtotal || "0");
    const depositAmount = parseFloat(meta.deposit_amount || "0");

    // Parse cart items
    let cartItems: { pid: string; n: string; q: number; p: number }[] = [];
    try {
      cartItems = JSON.parse(meta.cart_items_json || "[]");
    } catch { cartItems = []; }

    // Resolve company from first owner profile (since public bookings don't have auth)
    // Find company from slug
    const companySlug = meta.company_slug || "";
    let companyId: string | null = null;
    if (companySlug) {
      const { data: comp } = await supabaseAdmin
        .from("companies")
        .select("id")
        .eq("slug", companySlug)
        .single();
      if (comp) companyId = comp.id;
    }

    // Find an owner user to set as event creator
    let creatorId: string | null = null;
    if (companyId) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("company_id", companyId)
        .limit(1);
      if (profiles && profiles.length > 0) {
        creatorId = profiles[0].user_id;
      }
    }

    if (!creatorId) {
      // Fallback: find any owner
      const { data: anyProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .limit(1)
        .single();
      if (anyProfile) creatorId = anyProfile.user_id;
    }

    if (!creatorId) throw new Error("No company user found to create event");

    // 1. Create the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        title: `${customerName} - Rental`,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        location: eventLocation,
        notes: notes ? `Customer: ${customerName} (${customerEmail})\nPhone: ${customerPhone || "N/A"}\n\n${notes}` : `Customer: ${customerName} (${customerEmail})\nPhone: ${customerPhone || "N/A"}`,
        created_by: creatorId,
        crew_needed: 1,
        company_id: companyId,
      })
      .select("id")
      .single();

    if (eventError || !event) throw new Error(`Failed to create event: ${eventError?.message}`);

    // 2. Assign products to event (with atomic inventory validation)
    let inventoryWarning: string | null = null;
    if (cartItems.length > 0) {
      const productsPayload = cartItems.map((item) => ({
        pid: item.pid,
        quantity: item.q || 1,
      }));
      const { data: assignResult, error: assignError } = await supabaseAdmin.rpc(
        "assign_event_products",
        { _event_id: event.id, _products: productsPayload }
      );
      if (assignError) {
        console.error("Product assignment error:", assignError);
        inventoryWarning = `Product assignment failed: ${assignError.message}`;
      } else if (assignResult?.error) {
        console.error("Inventory exceeded:", assignResult.error);
        inventoryWarning = String(assignResult.error);
      }

      // If inventory failed, notify company owners so they can resolve manually
      if (inventoryWarning && creatorId) {
        await supabaseAdmin.from("notifications").insert({
          user_id: creatorId,
          title: "⚠️ Booking Inventory Issue",
          message: `Booking for ${customerName} on ${eventDate} was paid but inventory assignment failed: ${inventoryWarning}. Please review and resolve manually.`,
          type: "inventory_conflict",
          severity: "warning",
          event_id: event.id,
        });
      }
    }

    // 3. Create payment record
    let paymentMethodId: string | null = null;
    if (session.payment_intent) {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
      paymentMethodId = (pi.payment_method as string) || null;
    }

    await supabaseAdmin.from("payments").insert({
      event_id: event.id,
      amount: depositAmount,
      payment_type: "deposit",
      payment_status: "completed",
      payment_method: "stripe",
      stripe_session_id: session_id,
      stripe_customer_id: (session.customer as string) || null,
      stripe_payment_method_id: paymentMethodId,
      transaction_id: (session.payment_intent as string) || null,
    });

    // 4. Create a booking request record too for tracking
    const equipmentList = cartItems.map((i) => `${i.n} (x${i.q})`);
    await supabaseAdmin.from("booking_requests").insert({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      event_date: eventDate,
      event_time: startTime,
      event_end_time: endTime,
      event_location: eventLocation,
      equipment: equipmentList,
      special_requests: notes,
      status: "approved",
      event_id: event.id,
      company_id: companyId,
    });

    // 5. Send confirmation email
    try {
      await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          run_id: crypto.randomUUID(),
          message_id: crypto.randomUUID(),
          to: customerEmail,
          from: "SIOTO <noreply@notify.sioto.com>",
          sender_domain: "notify.sioto.com",
          subject: `Booking Confirmed — ${eventDate}`,
          html: `<h2>Booking Confirmed!</h2>
<p>Hey ${customerName}! Your booking for <strong>${eventDate}</strong> has been confirmed.</p>
<p><strong>Location:</strong> ${eventLocation}</p>
<p><strong>Time:</strong> ${startTime || "TBD"} - ${endTime || "TBD"}</p>
<p><strong>Equipment:</strong> ${equipmentList.join(", ")}</p>
<p><strong>Deposit Paid:</strong> $${depositAmount.toFixed(2)} (25% of $${subtotal.toFixed(2)})</p>
<p><strong>Balance Due:</strong> $${(subtotal - depositAmount).toFixed(2)}</p>
<p>We'll be in touch with setup details closer to your event date. Thank you!</p>`,
          purpose: "transactional",
          label: "booking_confirmation",
          queued_at: new Date().toISOString(),
        },
      });
    } catch (emailErr) {
      console.error("Email error (non-blocking):", emailErr);
    }

    return new Response(JSON.stringify({
      status: "confirmed",
      event_id: event.id,
      deposit_amount: depositAmount,
      subtotal,
      balance_due: subtotal - depositAmount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("confirm-booking-payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});