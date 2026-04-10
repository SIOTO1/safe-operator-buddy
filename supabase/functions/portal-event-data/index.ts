import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { token, action } = await req.json();
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

    if (tokenError || !portalToken) {
      return new Response(JSON.stringify({ error: "Invalid or expired portal link" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (new Date(portalToken.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This portal link has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const eventId = portalToken.event_id;

    // If action is "generate-portal-token", this is an internal call to create a token
    if (action === "generate-token") {
      // This path requires auth — check authorization header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data: userData } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData.user) throw new Error("Not authenticated");
    }

    // Fetch all event data
    const [eventRes, productsRes, paymentsRes, contractRes, orgRes, bookingRes] = await Promise.all([
      supabaseAdmin.from("events").select("*").eq("id", eventId).single(),
      supabaseAdmin
        .from("event_products")
        .select("id, product_id, quantity, products(name, category, price, image_url)")
        .eq("event_id", eventId),
      supabaseAdmin
        .from("payments")
        .select("id, amount, payment_status, payment_type, created_at")
        .eq("event_id", eventId)
        .order("created_at"),
      supabaseAdmin
        .from("contracts")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabaseAdmin
        .from("organization_settings")
        .select("*")
        .limit(1)
        .single(),
      supabaseAdmin
        .from("booking_requests")
        .select("customer_name, customer_email, customer_phone")
        .eq("event_id", eventId)
        .maybeSingle(),
    ]);

    if (eventRes.error) throw new Error("Event not found");

    // Get quote total if linked
    let quoteTotal = 0;
    let quoteItems: any[] = [];
    if (eventRes.data.quote_id) {
      const [quoteRes, itemsRes] = await Promise.all([
        supabaseAdmin.from("quotes").select("total_amount").eq("id", eventRes.data.quote_id).single(),
        supabaseAdmin.from("quote_items").select("*").eq("quote_id", eventRes.data.quote_id),
      ]);
      quoteTotal = quoteRes.data?.total_amount ?? 0;
      quoteItems = itemsRes.data || [];
    }

    const successfulPayments = (paymentsRes.data || []).filter((p: any) => p.payment_status === "completed");
    const totalPaid = successfulPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const depositPaid = successfulPayments
      .filter((p: any) => p.payment_type === "deposit")
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    return new Response(JSON.stringify({
      event: eventRes.data,
      products: (productsRes.data || []).map((ep: any) => ({
        id: ep.id,
        quantity: ep.quantity,
        name: ep.products?.name || "Unknown",
        category: ep.products?.category || "other",
        price: ep.products?.price,
        image_url: ep.products?.image_url,
      })),
      payments: paymentsRes.data || [],
      contract: contractRes.data,
      organization: orgRes.data,
      customer: bookingRes.data,
      quoteTotal,
      quoteItems,
      totalPaid,
      depositPaid,
      remainingBalance: Math.max(0, quoteTotal - totalPaid),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
