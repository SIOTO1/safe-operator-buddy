import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { render } from "npm:@react-email/render@0.0.12";
import { ContractSignedEmail } from "../_shared/email-templates/contract-signed.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notify.sioto.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, contract_id, signed_by, signature_image } = await req.json();
    if (!token || !contract_id || !signed_by || !signature_image) {
      throw new Error("Missing required fields");
    }

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

    // Verify contract belongs to this event
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .eq("event_id", portalToken.event_id)
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found for this event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (contract.signed_at) {
      return new Response(JSON.stringify({ error: "Contract is already signed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Upload signature image to storage
    const base64Data = signature_image.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `portal-${contract_id}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("signatures")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    let signatureUrl = signature_image; // fallback to base64
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage
        .from("signatures")
        .getPublicUrl(fileName);
      if (urlData?.publicUrl) signatureUrl = urlData.publicUrl;
    }

    // Update contract
    const signedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("contracts")
      .update({
        signed_by: signed_by,
        signed_at: signedAt,
        signature_image: signatureUrl,
      })
      .eq("id", contract_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send contract-signed confirmation email
    try {
      // Get event details and customer info
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("id, title, event_date, company_id")
        .eq("id", portalToken.event_id)
        .single();

      // Get company name
      let companyName = "SIOTO";
      if (event?.company_id) {
        const { data: org } = await supabaseAdmin
          .from("organization_settings")
          .select("company_name")
          .eq("company_id", event.company_id)
          .maybeSingle();
        if (org?.company_name) companyName = org.company_name;
      }

      // Get customer email from booking or CRM lead
      let customerEmail: string | null = null;
      let customerName = signed_by;

      const { data: booking } = await supabaseAdmin
        .from("booking_requests")
        .select("customer_email, customer_name")
        .eq("event_id", portalToken.event_id)
        .maybeSingle();

      if (booking?.customer_email) {
        customerEmail = booking.customer_email;
        customerName = booking.customer_name || signed_by;
      } else if (contract.quote_id) {
        // Fallback: CRM lead via quote
        const { data: quote } = await supabaseAdmin
          .from("quotes")
          .select("lead_id")
          .eq("id", contract.quote_id)
          .maybeSingle();
        if (quote?.lead_id) {
          const { data: lead } = await supabaseAdmin
            .from("crm_leads")
            .select("email, name")
            .eq("id", quote.lead_id)
            .maybeSingle();
          if (lead?.email) {
            customerEmail = lead.email;
            customerName = lead.name || signed_by;
          }
        }
      }

      if (customerEmail && event) {
        const eventDateObj = new Date(event.event_date + "T12:00:00Z");
        const formattedDate = eventDateObj.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
        const signedAtFormatted = new Date(signedAt).toLocaleString("en-US", {
          dateStyle: "long", timeStyle: "short",
        });

        const html = render(ContractSignedEmail({
          customer_name: customerName,
          company_name: companyName,
          event_title: event.title,
          event_date: formattedDate,
          signed_at: signedAtFormatted,
        }));

        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: crypto.randomUUID(),
            to: customerEmail,
            from: `${companyName} <noreply@${SENDER_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: `Contract Signed — ${event.title}`,
            html,
            purpose: "transactional",
            label: "contract_signed",
            queued_at: new Date().toISOString(),
          },
        });
      }
    } catch (emailErr) {
      console.error("Contract signed email error (non-blocking):", emailErr);
    }

    return new Response(JSON.stringify({ contract: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
