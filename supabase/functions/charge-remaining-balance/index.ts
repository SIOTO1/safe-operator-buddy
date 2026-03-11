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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const results: { event_id: string; status: string; error?: string }[] = [];

  try {
    // Find events happening within the next 48 hours
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const nowISO = now.toISOString().split("T")[0];
    const in48hISO = in48h.toISOString().split("T")[0];

    const { data: upcomingEvents, error: eventsError } = await supabaseAdmin
      .from("events")
      .select("id, title, event_date")
      .gte("event_date", nowISO)
      .lte("event_date", in48hISO);

    if (eventsError) throw eventsError;
    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events within 48h", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const event of upcomingEvents) {
      try {
        // Get all payments for this event
        const { data: payments } = await supabaseAdmin
          .from("payments")
          .select("*")
          .eq("event_id", event.id);

        if (!payments || payments.length === 0) {
          results.push({ event_id: event.id, status: "skipped", error: "No payments found" });
          continue;
        }

        // Calculate total paid
        const totalPaid = payments
          .filter((p: any) => p.payment_status === "completed")
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        // Get the contract to find quote total
        const { data: contracts } = await supabaseAdmin
          .from("contracts")
          .select("id, quote_id")
          .eq("event_id", event.id)
          .limit(1);

        if (!contracts || contracts.length === 0) {
          results.push({ event_id: event.id, status: "skipped", error: "No contract found" });
          continue;
        }

        const contract = contracts[0];

        // Get quote items total
        const { data: quoteItems } = await supabaseAdmin
          .from("quote_items")
          .select("unit_price, quantity")
          .eq("quote_id", contract.quote_id);

        if (!quoteItems || quoteItems.length === 0) {
          results.push({ event_id: event.id, status: "skipped", error: "No quote items" });
          continue;
        }

        const total = quoteItems.reduce(
          (sum: number, item: any) => sum + item.unit_price * item.quantity,
          0
        );
        const remaining = total - totalPaid;

        if (remaining <= 0) {
          results.push({ event_id: event.id, status: "skipped", error: "Already fully paid" });
          continue;
        }

        // Check if there's already a pending auto-charge for this event
        const existingAutoCharge = payments.find(
          (p: any) => p.payment_type === "auto_balance" && p.payment_status !== "failed"
        );
        if (existingAutoCharge) {
          results.push({ event_id: event.id, status: "skipped", error: "Auto-charge already exists" });
          continue;
        }

        // Find saved payment method from previous payments
        const paymentWithMethod = payments.find(
          (p: any) => p.stripe_customer_id && p.stripe_payment_method_id && p.payment_status === "completed"
        );

        if (!paymentWithMethod) {
          results.push({ event_id: event.id, status: "skipped", error: "No saved payment method" });
          continue;
        }

        const { stripe_customer_id, stripe_payment_method_id } = paymentWithMethod;
        const amountInCents = Math.round(remaining * 100);

        // Create off-session payment intent
        let paymentIntent;
        try {
          paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            customer: stripe_customer_id,
            payment_method: stripe_payment_method_id,
            off_session: true,
            confirm: true,
            description: `Auto-charge remaining balance for "${event.title}"`,
          });
        } catch (stripeErr: any) {
          // Payment failed - create failed payment record and notify
          await supabaseAdmin.from("payments").insert({
            event_id: event.id,
            contract_id: contract.id,
            quote_id: contract.quote_id,
            amount: remaining,
            payment_type: "auto_balance",
            payment_status: "failed",
            payment_method: "stripe",
            stripe_customer_id,
            stripe_payment_method_id,
            transaction_id: stripeErr.payment_intent?.id || null,
          });

          // Create notification for company (event creator)
          const { data: eventData } = await supabaseAdmin
            .from("events")
            .select("created_by")
            .eq("id", event.id)
            .single();

          if (eventData?.created_by) {
            await supabaseAdmin.from("notifications").insert({
              user_id: eventData.created_by,
              title: "Auto-charge Failed",
              message: `Automatic payment of $${remaining.toFixed(2)} failed for "${event.title}" (${event.event_date}). Reason: ${stripeErr.message}. Please contact the customer to arrange payment.`,
              type: "payment_failed",
              severity: "warning",
              event_id: event.id,
            });
          }

          // Send auto-charge failure email to customer
          try {
            const { data: booking } = await supabaseAdmin
              .from("booking_requests")
              .select("customer_email, customer_name")
              .eq("event_id", event.id)
              .maybeSingle();

            if (booking?.customer_email) {
              await supabaseAdmin.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  message_id: crypto.randomUUID(),
                  to: booking.customer_email,
                  from: "SIOTO <noreply@notify.sioto.com>",
                  sender_domain: "notify.sioto.com",
                  subject: `Payment Failed — ${event.title}`,
                  html: `<p>Hey ${booking.customer_name || "there"}! We attempted to charge the remaining balance of $${remaining.toFixed(2)} for "${event.title}" (${event.event_date}), but the payment didn't go through. Reason: ${stripeErr.message}. Please update your payment method or contact us.</p>`,
                  purpose: "transactional",
                  label: "auto_charge_alert",
                  queued_at: new Date().toISOString(),
                },
              });
            }
          } catch (emailErr) {
            console.error("Failed to enqueue auto-charge failure email:", emailErr);
          }

          results.push({ event_id: event.id, status: "failed", error: stripeErr.message });
          continue;
        }

        // Payment succeeded
        if (paymentIntent.status === "succeeded") {
          await supabaseAdmin.from("payments").insert({
            event_id: event.id,
            contract_id: contract.id,
            quote_id: contract.quote_id,
            amount: remaining,
            payment_type: "auto_balance",
            payment_status: "completed",
            payment_method: "stripe",
            stripe_customer_id,
            stripe_payment_method_id,
            transaction_id: paymentIntent.id,
          });

          // Notify the company owner
          const { data: eventData } = await supabaseAdmin
            .from("events")
            .select("created_by")
            .eq("id", event.id)
            .single();

          if (eventData?.created_by) {
            await supabaseAdmin.from("notifications").insert({
              user_id: eventData.created_by,
              title: "Auto-charge Successful",
              message: `Remaining balance of $${remaining.toFixed(2)} was automatically charged for "${event.title}" (${event.event_date}).`,
              type: "payment_success",
              severity: "info",
              event_id: event.id,
            });
          }

          // Send payment receipt email to customer
          try {
            const { data: booking } = await supabaseAdmin
              .from("booking_requests")
              .select("customer_email, customer_name")
              .eq("event_id", event.id)
              .maybeSingle();

            if (booking?.customer_email) {
              await supabaseAdmin.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  message_id: crypto.randomUUID(),
                  to: booking.customer_email,
                  from: "SIOTO <noreply@notify.sioto.com>",
                  sender_domain: "notify.sioto.com",
                  subject: `Payment Collected — ${event.title}`,
                  html: `<p>Hey ${booking.customer_name || "there"}! The remaining balance of $${remaining.toFixed(2)} for "${event.title}" (${event.event_date}) has been automatically charged to your card on file. No action needed — we look forward to your event!</p>`,
                  purpose: "transactional",
                  label: "auto_charge_alert",
                  queued_at: new Date().toISOString(),
                },
              });
            }
          } catch (emailErr) {
            console.error("Failed to enqueue auto-charge success email:", emailErr);
          }

          results.push({ event_id: event.id, status: "charged" });
        } else {
          results.push({ event_id: event.id, status: "pending", error: `Intent status: ${paymentIntent.status}` });
        }
      } catch (eventErr: any) {
        results.push({ event_id: event.id, status: "error", error: eventErr.message });
      }
    }

    return new Response(JSON.stringify({ message: "Auto-charge complete", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
