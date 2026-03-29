import { createClient } from "npm:@supabase/supabase-js@2";
import { render } from "npm:@react-email/render@0.0.12";
import { ReviewRequestEmail } from "../_shared/email-templates/review-request.tsx";
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

    // Can be called with a specific event_id or scan for completed events
    const body = await req.json().catch(() => ({}));
    const specificEventId = body?.event_id;

    // Get org settings for review link and company name
    const { data: orgSettings } = await supabase
      .from("organization_settings")
      .select("company_name, review_link")
      .limit(1)
      .maybeSingle();

    const reviewLink = orgSettings?.review_link;
    const companyName = orgSettings?.company_name || "SIOTO";

    if (!reviewLink) {
      return new Response(
        JSON.stringify({ message: "No review link configured in organization settings", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find completed events that haven't had review requests sent
    let query = supabase
      .from("events")
      .select("id, title, event_date, start_time, end_time, location")
      .eq("status", "completed")
      .eq("review_request_sent", false);

    if (specificEventId) {
      query = query.eq("id", specificEventId);
    }

    const { data: events, error: eventsErr } = await query;
    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No completed events pending review requests", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventIds = events.map(e => e.id);

    // Fetch booking info, products, and quote-linked lead info in parallel
    const [bookingsRes, productsRes, quoteLeadsRes] = await Promise.all([
      supabase
        .from("booking_requests")
        .select("event_id, customer_name, customer_email")
        .in("event_id", eventIds)
        .eq("status", "approved"),
      supabase
        .from("event_products")
        .select("event_id, quantity, product:products(name)")
        .in("event_id", eventIds),
      // For CRM-originated events: event → quote → lead
      supabase
        .from("events")
        .select("id, quote_id, quotes:quotes(lead_id, crm_leads:crm_leads(name, email))")
        .in("id", eventIds)
        .not("quote_id", "is", null),
    ]);

    const bookings = bookingsRes.data || [];
    const products = productsRes.data || [];
    const quoteLeads = quoteLeadsRes.data || [];

    let enqueued = 0;

    for (const event of events) {
      // Try booking first, then fall back to CRM lead via quote
      let customerName: string | null = null;
      let customerEmail: string | null = null;

      const booking = bookings.find(b => b.event_id === event.id);
      if (booking?.customer_email) {
        customerName = booking.customer_name;
        customerEmail = booking.customer_email;
      } else {
        // Fallback: check CRM lead via quote
        const ql = quoteLeads.find(q => q.id === event.id) as any;
        const lead = ql?.quotes?.crm_leads;
        if (lead?.email) {
          customerName = lead.name || "Customer";
          customerEmail = lead.email;
        }
      }

      if (!customerEmail) continue;

      // Get products for this event
      const eventProducts = products
        .filter(p => p.event_id === event.id)
        .map(p => {
          const name = (p as any).product?.name || "Unknown";
          return p.quantity > 1 ? `${name} (x${p.quantity})` : name;
        });

      // Format date
      const eventDateObj = new Date(event.event_date + "T12:00:00Z");
      const formattedDate = eventDateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Render email
      const html = render(ReviewRequestEmail({
        customer_name: customerName || "Customer",
        company_name: companyName,
        event_date: formattedDate,
        event_title: event.title,
        products: eventProducts,
        review_link: reviewLink,
      }));

      const reviewSubject = `How was your event? We'd love your review! ⭐`;
      const messageId = crypto.randomUUID();
      const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
          payload: {
            idempotency_key: `review-${messageId}`,
          message_id: messageId,
          to: customerEmail,
          from: `${companyName} <noreply@${SENDER_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: reviewSubject,
          html,
          text: reviewSubject,
          purpose: "transactional",
          label: "review_request",
          queued_at: new Date().toISOString(),
        },
      });

      if (enqueueErr) {
        console.error("Failed to enqueue review request:", enqueueErr);
        continue;
      }

      // Mark as sent
      await supabase
        .from("events")
        .update({ review_request_sent: true })
        .eq("id", event.id);

      enqueued++;
    }

    return new Response(
      JSON.stringify({ success: true, processed: enqueued }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-review-request error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
