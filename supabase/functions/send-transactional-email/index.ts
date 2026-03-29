import { createClient } from "npm:@supabase/supabase-js@2";
import { render } from "npm:@react-email/render@0.0.12";
import { BookingConfirmationEmail } from "../_shared/email-templates/booking-confirmation.tsx";
import { PaymentReceiptEmail } from "../_shared/email-templates/payment-receipt.tsx";
import { OwnerNotificationEmail } from "../_shared/email-templates/owner-notification.tsx";
import { AutoChargeAlertEmail } from "../_shared/email-templates/auto-charge-alert.tsx";
import { getUnsubscribeToken } from "../_shared/unsubscribe-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notify.sioto.ai";

type TemplateType = "booking_confirmation" | "payment_receipt" | "owner_notification" | "auto_charge_alert";

interface SendEmailPayload {
  template: TemplateType;
  to: string;
  data: Record<string, any>;
}

function renderTemplate(template: TemplateType, data: Record<string, any>): { subject: string; html: string } {
  switch (template) {
    case "booking_confirmation":
      return {
        subject: `Booking Confirmation — ${data.event_date}`,
        html: render(BookingConfirmationEmail(data as any)),
      };
    case "payment_receipt":
      return {
        subject: `Payment Receipt — $${Number(data.amount).toFixed(2)}`,
        html: render(PaymentReceiptEmail(data as any)),
      };
    case "owner_notification":
      return {
        subject: `New Booking: ${data.customer_name} — ${data.event_date}`,
        html: render(OwnerNotificationEmail(data as any)),
      };
    case "auto_charge_alert":
      return {
        subject: data.success
          ? `Payment Collected — ${data.event_title}`
          : `Payment Failed — ${data.event_title}`,
        html: render(AutoChargeAlertEmail(data as any)),
      };
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { template, to, data } = (await req.json()) as SendEmailPayload;

    if (!template || !to) {
      return new Response(JSON.stringify({ error: "Missing template or to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = renderTemplate(template, data);
    const messageId = crypto.randomUUID();
    const unsubscribe_token = await getUnsubscribeToken(supabase, to);

    const { error } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        idempotency_key: `txn-${messageId}`,
        message_id: messageId,
        to,
        from: `SIOTO <noreply@${SENDER_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text: subject,
        purpose: "transactional",
        label: template,
        unsubscribe_token,
        queued_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("Failed to enqueue email:", error);
      return new Response(JSON.stringify({ error: "Failed to enqueue email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message_id: messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-transactional-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
