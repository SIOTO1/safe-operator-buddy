import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_SOURCES = [
  "Website",
  "Training Inquiry",
  "Certification Inquiry",
  "Referral",
  "Manual Entry",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { name, email, phone, company, source } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "A valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (source && !VALID_SOURCES.includes(source)) {
      return new Response(
        JSON.stringify({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: lead, error } = await supabase
      .from("crm_leads")
      .insert({
        name: name.trim().slice(0, 200),
        email: email.trim().slice(0, 255),
        phone: phone?.trim().slice(0, 50) || null,
        company: company?.trim().slice(0, 200) || null,
        source: source || "Website",
        stage: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The database trigger (trg_auto_followup_task) automatically creates
    // a follow-up task 24h from now for every new lead.

    return new Response(
      JSON.stringify({ success: true, lead_id: lead.id }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
