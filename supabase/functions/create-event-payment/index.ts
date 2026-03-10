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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { quote_id, event_id, contract_id, amount, payment_type, description } = await req.json();
    if (!amount || amount <= 0) throw new Error("Invalid payment amount");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({ email: user.email });
      customerId = newCustomer.id;
    }

    const amountInCents = Math.round(amount * 100);

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
              name: description || `${payment_type === 'deposit' ? 'Deposit' : payment_type === 'partial' ? 'Partial Payment' : 'Full Payment'}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard/crm/contracts/${contract_id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dashboard/crm/contracts/${contract_id}?payment=canceled`,
      metadata: {
        quote_id: quote_id || "",
        event_id: event_id || "",
        contract_id: contract_id || "",
        payment_type,
      },
    });

    // Create payment record
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin.from("payments").insert({
      quote_id,
      event_id,
      contract_id,
      amount,
      payment_type,
      payment_status: "pending",
      payment_method: "stripe",
      stripe_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
