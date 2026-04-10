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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (session.payment_status === "paid") {
      // Retrieve payment intent to get the payment method
      let paymentMethodId: string | null = null;
      if (session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        paymentMethodId = (paymentIntent.payment_method as string) || null;
      }

      // Get the payment record before updating
      const { data: paymentRecord } = await supabaseAdmin
        .from("payments")
        .select("id, event_id, amount, payment_type")
        .eq("stripe_session_id", session_id)
        .single();

      await supabaseAdmin
        .from("payments")
        .update({
          payment_status: "completed",
          transaction_id: session.payment_intent as string,
          stripe_customer_id: session.customer as string || null,
          stripe_payment_method_id: paymentMethodId,
        })
        .eq("stripe_session_id", session_id);

      // Log payment completed
      if (paymentRecord) {
        // Get user from auth header
        const token = authHeader!.replace("Bearer ", "");
        const supabaseUser = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );
        const { data: userData } = await supabaseUser.auth.getUser(token);

        let companyId: string | null = null;
        if (paymentRecord.event_id) {
          const { data: ev } = await supabaseAdmin.from("events").select("company_id").eq("id", paymentRecord.event_id).single();
          companyId = ev?.company_id || null;
        }

        const actionType = paymentRecord.payment_type === "deposit" ? "deposit_received" : "payment_completed";

        await supabaseAdmin.from("payment_activity_logs").insert({
          company_id: companyId,
          event_id: paymentRecord.event_id,
          payment_id: paymentRecord.id,
          user_id: userData?.user?.id || "00000000-0000-0000-0000-000000000000",
          action_type: actionType,
          amount: Number(paymentRecord.amount),
          notes: `${paymentRecord.payment_type} payment of $${Number(paymentRecord.amount).toFixed(2)} completed`,
        });
      }

      return new Response(JSON.stringify({ status: "completed", transaction_id: session.payment_intent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: session.payment_status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
