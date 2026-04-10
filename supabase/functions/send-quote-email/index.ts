import { createClient } from "npm:@supabase/supabase-js@2";
import { render } from "npm:@react-email/render@0.0.17";
import { QuoteSentEmail } from "../_shared/email-templates/quote-sent.tsx";
import { getUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notify.sioto.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { quote_id } = await req.json();
    if (!quote_id) throw new Error("Missing quote_id");

    // Get quote with lead info and items
    const [quoteRes, itemsRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("id, title, total_amount, lead_id, company_id, status, crm_leads:crm_leads(name, email)")
        .eq("id", quote_id)
        .single(),
      supabase
        .from("quote_items")
        .select("product_name, quantity, unit_price")
        .eq("quote_id", quote_id),
    ]);

    if (quoteRes.error) throw quoteRes.error;
    const quote = quoteRes.data as any;
    const items = itemsRes.data || [];

    // Get customer email from linked lead
    const lead = quote.crm_leads;
    if (!lead?.email) {
      return new Response(
        JSON.stringify({ message: "No lead email linked to this quote", sent: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company name
    let companyName = "SIOTO";
    if (quote.company_id) {
      const { data: org } = await supabase
        .from("organization_settings")
        .select("company_name")
        .eq("company_id", quote.company_id)
        .maybeSingle();
      if (org?.company_name) companyName = org.company_name;
    }

    const html = render(QuoteSentEmail({
      customer_name: lead.name || "Customer",
      company_name: companyName,
      quote_title: quote.title,
      total_amount: quote.total_amount || 0,
      items: items.map((i: any) => ({
        name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    }));

    const quoteSubject = `Quote Ready — ${quote.title}`;
    const quoteMessageId = crypto.randomUUID();
    const unsubscribe_token = await getUnsubscribeToken(supabase, lead.email);
    const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `quote-${quoteMessageId}`,
        message_id: quoteMessageId,
        to: lead.email,
        from: `${companyName} <noreply@${SENDER_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: quoteSubject,
        html,
        text: quoteSubject,
        purpose: "transactional",
        label: "quote_sent",
        unsubscribe_token,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueErr) throw enqueueErr;

    return new Response(
      JSON.stringify({ success: true, sent_to: lead.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-quote-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
