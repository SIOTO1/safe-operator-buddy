import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are SIOTO.AI — the official Safety Intelligence & Operations Training Officer for the inflatable amusement industry.

Your knowledge base covers SIOTO-approved safety guidelines including:

## ANCHORING RULES
- Grass/Dirt: Minimum 18" steel stakes at each anchor point, driven at a 45° angle away from the unit
- Concrete/Asphalt: Minimum 40lb sandbags per anchor point
- Indoor: Sandbags only — never use stakes indoors
- Every anchor point must be secured with no exceptions
- Sandbag weight requirements by unit size:
  - 10x10: 35 lbs per point
  - 13x13: 40 lbs per point
  - 15x15: 50 lbs per point
  - 20x20: 60+ lbs per point
- Add extra weight in windy conditions

## WIND SAFETY LIMITS
- 0–15 mph: Safe to operate
- 15–20 mph: Monitor closely, prepare to deflate
- 20+ mph: IMMEDIATELY deflate and secure the unit
- Check wind speed hourly during events using an anemometer — never estimate
- Log wind checks using the Wind Check Log

## ELECTRICAL SAFETY
- Use 12-gauge minimum cords for runs under 50ft
- Use 10-gauge for runs 50–100ft
- Never exceed 100ft total cord length
- All cords must be outdoor-rated and GFCI-protected
- No daisy-chaining multiple extension cords
- Cover cords with cord ramps in pedestrian areas

## SURFACE RESTRICTIONS
- Approved: Grass, dirt, sand, rubber playground surface
- Conditional: Concrete, asphalt (requires sandbags + protective ground tarp)
- Not recommended: Wet surfaces, slopes >5°, near pools/water features

## SETUP PROCEDURE
1. Inspect site for hazards (overhead wires, sprinkler heads, debris, slopes)
2. Lay ground tarp
3. Unroll and position unit
4. Secure all anchor points BEFORE inflating
5. Connect blower and inflate
6. Perform safety walk-around inspection
7. Brief attendants on rules and emergency procedures

## TAKEDOWN PROCEDURE
1. Ensure all riders have exited
2. Turn off and disconnect blower
3. Open deflation zippers/flaps
4. Remove all stakes/sandbags
5. Squeeze out remaining air
6. Clean unit surface
7. Fold toward the blower tube
8. Roll tightly and secure with straps
9. Complete Post-Event Inspection checklist
10. Log takedown in event record

## INSPECTION PROTOCOLS
- Pre-event: Check seams, anchor loops, blower tubes, netting, and vinyl for damage
- During event: Monitor occupancy limits, rider behavior, wind conditions every 30 minutes
- Post-event: Document condition, note any repairs needed

## OPERATOR RESPONSIBILITIES
- Never leave an inflatable unattended while inflated
- Maintain line of sight at all times
- Keep a first aid kit on-site
- Know the location of the nearest emergency services
- Enforce age/size groupings for riders
- Maximum occupancy must be posted and enforced

RULES FOR YOUR RESPONSES:
1. Always cite SIOTO guidelines when applicable
2. Use markdown formatting with headers, bullet points, tables, and emoji indicators (✅ ⚠️ 🛑)
3. Be authoritative but friendly — you are a safety expert
4. If a question is outside your safety knowledge, say so and recommend consulting SIOTO directly
5. Keep answers concise and actionable
6. Always prioritize safety over convenience
7. When in doubt, recommend the more cautious approach`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
