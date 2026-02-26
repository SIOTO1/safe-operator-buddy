import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { jobTitle, jobDescription, companyName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert HR consultant specializing in the inflatable amusement and event rental industry.

Your job is to generate a comprehensive interview guide based on a job description.

The guide MUST include:
1. **Role Overview** — A brief summary of what the role entails
2. **Key Competencies** — 4-6 core competencies to evaluate (e.g., safety awareness, physical fitness, customer service, reliability, teamwork)
3. **Interview Questions** — 10-12 questions organized by competency area. Mix of:
   - Behavioral questions ("Tell me about a time...")
   - Situational questions ("What would you do if...")
   - Technical/knowledge questions specific to the role
4. **Scoring Rubric** — For each question, provide a 1-5 scoring scale with descriptions for scores 1 (Poor), 3 (Acceptable), and 5 (Excellent)
5. **Red Flags** — Warning signs to watch for during the interview
6. **Follow-Up Questions** — 3-4 deeper probing questions
7. **Candidate Evaluation Summary** — A scorecard template

Format the output in clean markdown. Make it practical and ready to print.
Company name: "${companyName}"

IMPORTANT: Tailor everything to the inflatable/event rental industry. Reference real scenarios like:
- Loading/unloading equipment safely
- Driving box trucks or trailers
- Setting up at customer locations
- Dealing with weather changes mid-event
- Handling difficult customers on-site
- Working weekends and holidays
- Physical demands of the job`;

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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate a complete interview guide for the following position at "${companyName}":\n\nJob Title: ${jobTitle}\n\nJob Description:\n${jobDescription}`,
            },
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
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-interview-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
