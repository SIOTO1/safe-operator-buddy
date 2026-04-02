import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { token, password, display_name, verify_only } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the invite
    const { data: invite, error: inviteError } = await supabase
      .from("user_invites")
      .select("*")
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if invite is older than 7 days
    const createdAt = new Date(invite.created_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (createdAt < sevenDaysAgo) {
      await supabase
        .from("user_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return new Response(JSON.stringify({ error: "This invitation has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the company name
    const { data: company } = await supabase
      .from("companies")
      .select("name, slug")
      .eq("id", invite.company_id)
      .single();

    const companyName = company?.name || "your team";
    const companySlug = company?.slug || "";

    // If verify_only, just return invite details without creating account
    if (verify_only) {
      return new Response(
        JSON.stringify({
          valid: true,
          email: invite.email,
          role: invite.role,
          company_name: companyName,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password) {
      return new Response(JSON.stringify({ error: "Missing password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a user with this email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === invite.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create the user account
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: display_name || invite.email.split("@")[0],
        },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(JSON.stringify({ error: "Failed to create account" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;
    }

    // Update profile to link to company
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_id: invite.company_id,
        display_name: display_name || invite.email.split("@")[0],
      })
      .eq("user_id", userId);

    // If profile doesn't exist yet (trigger may not have fired), create it
    if (profileError) {
      await supabase.from("profiles").insert({
        user_id: userId,
        email: invite.email,
        company_id: invite.company_id,
        display_name: display_name || invite.email.split("@")[0],
      });
    }

    // Map invite role to app_role for user_roles table
    const appRoleMap: Record<string, string> = {
      admin: "owner",
      manager: "manager",
      staff: "crew",
    };

    // Upsert user_roles
    await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: appRoleMap[invite.role] || "crew" },
        { onConflict: "user_id,role" }
      );

    // Upsert company_users
    await supabase
      .from("company_users")
      .upsert(
        {
          company_id: invite.company_id,
          user_id: userId,
          role: invite.role,
          status: "active",
        },
        { onConflict: "company_id,user_id" }
      );

    // Mark invite as accepted
    await supabase
      .from("user_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({
        success: true,
        email: invite.email,
        company_name: companyName,
        company_slug: companySlug,
        message: "Account created successfully. You can now sign in.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("accept-invite error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
