import { createClient } from "npm:@supabase/supabase-js@2";
import { render } from "npm:@react-email/render@0.0.12";
import { CertExpirationAlertEmail } from "../_shared/email-templates/cert-expiration-alert.tsx";

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

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get all active certs expiring within 30 days (or already expired but still marked active)
    const { data: certs, error: certsError } = await supabase
      .from("employee_certifications")
      .select("*, employees(name, company_id)")
      .eq("certification_status", "active")
      .lte("expiration_date", in30Days.toISOString().split("T")[0])
      .order("expiration_date", { ascending: true });

    if (certsError) {
      console.error("Error fetching certs:", certsError);
      return new Response(JSON.stringify({ error: certsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!certs || certs.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring certs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by company_id
    const byCompany: Record<string, typeof certs> = {};
    for (const cert of certs) {
      const companyId = (cert.employees as any)?.company_id;
      if (!companyId) continue;
      if (!byCompany[companyId]) byCompany[companyId] = [];
      byCompany[companyId].push(cert);
    }

    let emailsSent = 0;

    for (const [companyId, companyCerts] of Object.entries(byCompany)) {
      // Find owner/manager users for this company
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .eq("company_id", companyId);

      if (!profiles || profiles.length === 0) continue;

      // Check which are owners/managers
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profiles.map(p => p.user_id))
        .in("role", ["owner", "manager"]);

      if (!roles || roles.length === 0) continue;

      const adminUserIds = new Set(roles.map(r => r.user_id));
      const adminEmails = profiles
        .filter(p => adminUserIds.has(p.user_id) && p.email)
        .map(p => p.email!);

      if (adminEmails.length === 0) continue;

      // Get company name
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      const expiringCertsData = companyCerts.map(c => {
        const expDate = new Date(c.expiration_date);
        const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          employee_name: (c.employees as any)?.name || "Unknown",
          certification_name: c.certification_name,
          expiration_date: expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          days_remaining: Math.max(0, daysRemaining),
          is_expired: daysRemaining < 0,
        };
      });

      const html = render(CertExpirationAlertEmail({
        company_name: company?.name || "Your Company",
        expiring_certs: expiringCertsData,
        total_count: expiringCertsData.length,
      }));

      const subject = `⚠️ ${expiringCertsData.length} Certification${expiringCertsData.length > 1 ? "s" : ""} Expiring Soon`;

      // Send to each admin
      for (const email of adminEmails) {
        const messageId = crypto.randomUUID();
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            idempotency_key: `cert-${messageId}`,
            message_id: messageId,
            to: email,
            from: `SIOTO <noreply@${SENDER_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            purpose: "transactional",
            label: "cert_expiration_alert",
            queued_at: new Date().toISOString(),
          },
        });
        emailsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, emails_sent: emailsSent, companies: Object.keys(byCompany).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("check-cert-expirations error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
