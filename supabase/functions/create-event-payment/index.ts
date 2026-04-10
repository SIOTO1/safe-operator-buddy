import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Rate limit: 5 payment attempts per minute per user
    const supabaseRateLimit = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: rlAllowed } = await supabaseRateLimit.rpc("check_rate_limit", {
      _identifier: user.id,
      _action: "payment_attempt",
      _max_requests: 5,
      _window_seconds: 60,
    });
    if (!rlAllowed) {
      return new Response(JSON.stringify({ error: "Too many payment attempts. Please wait a moment and try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const { quote_id, event_id, contract_id, amount, payment_type, description } = await req.json();
    if (!amount || amount <= 0) throw new Error("Invalid payment amount");

    // Resolve company_id from event
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    let paymentCompanyId: string | null = null;
    if (event_id) {
      const { data: ev } = await supabaseAdmin.from("events").select("company_id").eq("id", event_id).single();
      paymentCompanyId = ev?.company_id ?? null;
    }

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

    // Stripe Connect: route to connected account if available
    let connectParams: Record<string, any> = {};
    if (paymentCompanyId) {
      const { data: comp } = await supabaseAdmin
        .from("companies")
        .select("stripe_account_id, stripe_onboarding_complete, platform_fee_percent")
        .eq("id", paymentCompanyId)
        .single();

      if (comp?.stripe_account_id && comp.stripe_onboarding_complete) {
        const feePercent = comp.platform_fee_percent ?? 5;
        const applicationFee = Math.round(amountInCents * (feePercent / 100));
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
    const { data: paymentRecord, error: insertErr } = await supabaseAdmin.from("payments").insert({
      quote_id,
      event_id,
      contract_id,
      company_id: paymentCompanyId,
      amount,
      payment_type,
      payment_status: "pending",
      payment_method: "stripe",
      stripe_session_id: session.id,
      stripe_customer_id: customerId,
    }).select("id").single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(JSON.stringify({ url: session.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw new Error("Failed to create payment record");
    }

    // Get company_id for audit log
    let companyId: string | null = null;
    if (event_id) {
      const { data: ev } = await supabaseAdmin.from("events").select("company_id").eq("id", event_id).single();
      companyId = ev?.company_id || null;
    }

    // Log payment creation
    await supabaseAdmin.from("payment_activity_logs").insert({
      company_id: companyId,
      event_id: event_id || null,
      payment_id: paymentRecord?.id || null,
      user_id: user.id,
      action_type: "payment_created",
      amount,
      notes: `${payment_type} payment of $${amount.toFixed(2)} initiated via Stripe`,
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
