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

    // --- P0 FIX: Pre-checkout inventory availability check ---
    // Look up company_id from slug
    let companyId: string | null = null;
    if (company_slug) {
      const { data: comp } = await supabaseAdmin.from("companies").select("id").eq("slug", company_slug).single();
      if (comp) companyId = comp.id;
    }

    if (companyId) {
      // Get current allocations for the event date
      const { data: allocations } = await supabaseAdmin.rpc("get_product_availability", {
        _company_id: companyId,
        _date: event_date,
      });

      const allocMap: Record<string, number> = {};
      if (allocations) {
        (allocations as { product_id: string; units_allocated: number }[]).forEach((a) => {
          allocMap[a.product_id] = a.units_allocated;
        });
      }

      // Get product inventory limits
      const productIds = cart_items.map((i: any) => i.product_id).filter(Boolean);
      if (productIds.length > 0) {
        const { data: products } = await supabaseAdmin
          .from("products")
          .select("id, name, quantity_available, price")
          .in("id", productIds);

        const unavailable: string[] = [];
        const priceMismatches: string[] = [];

        for (const item of cart_items) {
          const product = (products || []).find((p: any) => p.id === item.product_id);
          if (!product) { unavailable.push(item.product_name || "Unknown"); continue; }

          const allocated = allocMap[item.product_id] || 0;
          const available = product.quantity_available - allocated;
          if ((item.quantity || 1) > available) {
            unavailable.push(`${product.name} (need ${item.quantity}, only ${available} available)`);
          }

          // P2 FIX: Server-side price validation
          if (product.price !== null && Math.abs((item.unit_price || 0) - product.price) > 0.01) {
            priceMismatches.push(product.name);
            item.unit_price = product.price; // Correct to server-side price
          }
        }

        if (unavailable.length > 0) {
          return new Response(JSON.stringify({
            error: "Some items are no longer available for this date",
            unavailable,
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Calculate totals (using server-validated prices)
    const subtotal = cart_items.reduce((sum: number, item: any) => sum + (item.unit_price || 0) * (item.quantity || 1), 0);
    const depositAmount = Math.round(subtotal * DEPOSIT_PERCENT * 100) / 100;
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

    const origin = req.headers.get("origin") || "https://sioto.ai";

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

    // Stripe Connect: route payment to connected account if available
    let connectParams: Record<string, any> = {};
    if (companyId) {
      const { data: comp } = await supabaseAdmin
        .from("companies")
        .select("stripe_account_id, stripe_onboarding_complete, platform_fee_percent")
        .eq("id", companyId)
        .single();

      if (comp?.stripe_account_id && comp.stripe_onboarding_complete) {
        const feePercent = comp.platform_fee_percent ?? 5;
        const applicationFee = Math.round(depositCents * (feePercent / 100));
        connectParams = {
          payment_intent_data: {
            setup_future_usage: "off_session" as const,
            application_fee_amount: applicationFee,
            transfer_data: {
              destination: comp.stripe_account_id,
            },
          },
        };
      }
    }

    // If no connect params, use default payment_intent_data
    if (!connectParams.payment_intent_data) {
      connectParams = {
        payment_intent_data: {
          setup_future_usage: "off_session" as const,
        },
      };
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      ...connectParams,
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
