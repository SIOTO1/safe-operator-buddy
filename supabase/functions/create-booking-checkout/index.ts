import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEPOSIT_PERCENT = 0.25;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      event_date,
      start_time,
      end_time,
      event_location,
      cart_items, // { product_id, product_name, quantity, unit_price }[]
      notes,
      company_slug,
    } = body;

    // --- Validation ---
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2 || customer_name.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid name" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customer_email || !emailRegex.test(customer_email) || customer_email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!event_date || !event_location || !Array.isArray(cart_items) || cart_items.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit
    const { data: rlAllowed } = await supabaseAdmin.rpc("check_rate_limit", {
      _identifier: customer_email.trim().toLowerCase(),
      _action: "booking_checkout",
      _max_requests: 5,
      _window_seconds: 300,
    });
    if (!rlAllowed) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please wait a few minutes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calculate totals
    const subtotal = cart_items.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * (item.quantity || 1), 0);
    const depositAmount = Math.round(subtotal * DEPOSIT_PERCENT * 100) / 100; // round to cents
    const depositCents = Math.round(depositAmount * 100);

    if (depositCents < 50) {
      return new Response(JSON.stringify({ error: "Minimum order amount not met" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stripe checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Find or create customer
    const customers = await stripe.customers.list({ email: customer_email.trim().toLowerCase(), limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCust = await stripe.customers.create({
        email: customer_email.trim().toLowerCase(),
        name: customer_name.trim(),
        phone: customer_phone?.trim() || undefined,
      });
      customerId = newCust.id;
    }

    const origin = req.headers.get("origin") || "https://id-preview--9c9e3625-06c4-4d28-87a2-b1e5d562271a.lovable.app";

    // Store booking data in metadata (Stripe limits: 500 chars per value)
    const bookingMeta = {
      customer_name: customer_name.trim().substring(0, 100),
      customer_email: customer_email.trim().toLowerCase(),
      customer_phone: (customer_phone?.trim() || "").substring(0, 20),
      event_date,
      start_time: start_time || "",
      end_time: end_time || "",
      event_location: event_location.trim().substring(0, 300),
      notes: (notes?.trim() || "").substring(0, 400),
      company_slug: company_slug || "",
      subtotal: String(subtotal),
      deposit_amount: String(depositAmount),
      cart_items_json: JSON.stringify(cart_items.map((i: any) => ({
        pid: i.product_id,
        n: i.product_name?.substring(0, 50),
        q: i.quantity,
        p: i.unit_price,
      }))).substring(0, 500),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_intent_data: {
        setup_future_usage: "off_session",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Booking Deposit (${Math.round(DEPOSIT_PERCENT * 100)}%)`,
              description: `Deposit for ${event_date} - ${cart_items.length} item(s)`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/rentals/${company_slug || "store"}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/rentals/${company_slug || "store"}?booking=canceled`,
      metadata: bookingMeta,
    });

    return new Response(JSON.stringify({
      url: session.url,
      deposit_amount: depositAmount,
      subtotal,
      session_id: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-booking-checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});