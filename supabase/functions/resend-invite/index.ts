import { createClient } from "npm:@supabase/supabase-js@2";
import { render } from "npm:@react-email/render@0.0.12";
import { TeamInviteEmail } from "../_shared/email-templates/team-invite.tsx";
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminCheck } = await supabase
      .from("company_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .eq("status", "active")
      .single();

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Only admins can resend invites" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invite_ids } = await req.json();

    if (!invite_ids || !Array.isArray(invite_ids) || invite_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Missing invite_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, display_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .single();

    // Fetch pending OR expired invites belonging to this company
    const { data: invites, error: invErr } = await supabase
      .from("user_invites")
      .select("id, email, role, invite_token, status")
      .in("id", invite_ids)
      .eq("company_id", profile.company_id)
      .in("status", ["pending", "expired"]);

    if (invErr || !invites || invites.length === 0) {
      return new Response(JSON.stringify({ error: "No valid invites found to resend" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = "https://sioto.ai";
    let sent = 0;

    for (const invite of invites) {
      // Generate a fresh token and reset created_at for a new 7-day window
      const newToken = crypto.randomUUID();
      await supabase
        .from("user_invites")
        .update({
          invite_token: newToken,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      const inviteUrl = `${siteUrl}/invite/${newToken}`;
      const roleLabel = invite.role.charAt(0).toUpperCase() + invite.role.slice(1);

      const html = render(
        TeamInviteEmail({
          companyName: company?.name || "the team",
          role: roleLabel,
          inviteUrl,
          invitedByName: profile.display_name || user.email || "A team admin",
        })
      );

      const subject = `You're invited to join ${company?.name || "the team"}`;
      const messageId = crypto.randomUUID();
      const unsubscribe_token = await getUnsubscribeToken(supabase, invite.email);
      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          idempotency_key: `invite-resend-${invite.id}-${Date.now()}`,
          message_id: messageId,
          to: invite.email,
          from: `${company?.name || "SIOTO"} <noreply@${SENDER_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: subject,
          purpose: "transactional",
          label: "team_invite_resend",
          unsubscribe_token,
          queued_at: new Date().toISOString(),
        },
      });

      if (!enqueueError) sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("resend-invite error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
