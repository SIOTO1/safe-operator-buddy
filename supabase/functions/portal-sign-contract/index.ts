import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("contracts")
      .update({
        signed_by: signed_by,
        signed_at: new Date().toISOString(),
        signature_image: signatureUrl,
      })
      .eq("id", contract_id)
      .select()
      .single();

    if (updateError) throw updateError;

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
