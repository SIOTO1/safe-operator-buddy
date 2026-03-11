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
    const { token, customer_email, customer_name, amount: customAmount } = await req.json();
    if (!token) throw new Error("Missing token");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify token
    const { data: portalToken, error: tokenError } = await supabaseAdmin
      .from("portal_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !portalToken) throw new Error("Invalid portal link");
    if (new Date(portalToken.expires_at) < new Date()) throw new Error("Portal link expired");

    const eventId = portalToken.event_id;

    // Get event and quote
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, quote_id")
      .eq("id", eventId)
      .single();

    if (!event) throw new Error("Event not found");

    // Calculate remaining balance
    let quoteTotal = 0;
    if (event.quote_id) {
      const { data: quote } = await supabaseAdmin
        .from("quotes")
        .select("total_amount")
        .eq("id", event.quote_id)
        .single();
      quoteTotal = quote?.total_amount ?? 0;
    }

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount, payment_status")
      .eq("event_id", eventId);

    const totalPaid = (payments || [])
      .filter((p: any) => p.payment_status === "completed")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    const remaining = Math.max(0, quoteTotal - totalPaid);
    if (remaining <= 0) throw new Error("No remaining balance to pay");

    // Determine charge amount — allow custom amount up to remaining
    let chargeAmount = remaining;
    let paymentType = "balance";
    if (customAmount && Number(customAmount) > 0) {
      chargeAmount = Math.min(Number(customAmount), remaining);
      paymentType = chargeAmount >= remaining ? "balance" : "partial";
    }

    if (chargeAmount < 0.50) throw new Error("Minimum payment amount is $0.50");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const email = customer_email || "customer@example.com";
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email,
        name: customer_name || undefined,
      });
      customerId = newCustomer.id;
    }

    const label = chargeAmount >= remaining
      ? `Full Remaining Balance — ${event.title}`
      : `Partial Payment — ${event.title}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_intent_data: { setup_future_usage: "off_session" },
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: label },
          unit_amount: Math.round(chargeAmount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/portal/event/${token}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/portal/event/${token}?payment=canceled`,
      metadata: {
        event_id: eventId,
        quote_id: event.quote_id || "",
        payment_type: paymentType,
        portal_token: token,
      },
    });

    // Create pending payment record
    await supabaseAdmin.from("payments").insert({
      event_id: eventId,
      quote_id: event.quote_id,
      amount: chargeAmount,
      payment_type: paymentType,
      payment_status: "pending",
      payment_method: "stripe",
      stripe_session_id: session.id,
      stripe_customer_id: customerId,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
