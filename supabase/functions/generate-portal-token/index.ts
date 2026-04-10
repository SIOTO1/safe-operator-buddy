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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) throw new Error("Not authenticated");

    const { event_id } = await req.json();
    if (!event_id) throw new Error("Missing event_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if token already exists for this event
    const { data: existing } = await supabaseAdmin
      .from("portal_tokens")
      .select("token, expires_at")
      .eq("event_id", event_id)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ token: existing.token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new token
    const { data: newToken, error } = await supabaseAdmin
      .from("portal_tokens")
      .insert({ event_id })
      .select("token")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ token: newToken.token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
