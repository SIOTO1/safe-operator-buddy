import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch pending/retrying jobs that are due
    const { data: jobs, error: fetchError } = await supabaseAdmin
      .from("background_jobs")
      .select("*")
      .in("status", ["pending", "retrying"])
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No jobs to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; status: string; error?: string }[] = [];

    for (const job of jobs) {
      // Mark as processing
      await supabaseAdmin
        .from("background_jobs")
        .update({ status: "processing", started_at: new Date().toISOString(), attempts: job.attempts + 1 })
        .eq("id", job.id);

      try {
        await processJob(supabaseAdmin, job);

        await supabaseAdmin
          .from("background_jobs")
          .update({ status: "completed", processed_at: new Date().toISOString(), error_message: null })
          .eq("id", job.id);

        results.push({ id: job.id, status: "completed" });
      } catch (err: any) {
        const newAttempts = job.attempts + 1;
        const shouldRetry = newAttempts < job.max_attempts;

        await supabaseAdmin
          .from("background_jobs")
          .update({
            status: shouldRetry ? "retrying" : "failed",
            error_message: err.message || "Unknown error",
            processed_at: shouldRetry ? null : new Date().toISOString(),
            // Exponential backoff: 1min, 4min, 9min...
            scheduled_for: shouldRetry
              ? new Date(Date.now() + newAttempts * newAttempts * 60000).toISOString()
              : undefined,
          })
          .eq("id", job.id);

        results.push({ id: job.id, status: shouldRetry ? "retrying" : "failed", error: err.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function processJob(supabase: any, job: any) {
  const { job_type, payload } = job;

  switch (job_type) {
    case "email_notification":
      await handleEmailNotification(supabase, payload);
      break;
    case "balance_charge":
      await handleBalanceCharge(supabase, payload);
      break;
    case "weather_check":
      await handleWeatherCheck(supabase, payload);
      break;
    case "report_generation":
      await handleReportGeneration(supabase, payload);
      break;
    default:
      throw new Error(`Unknown job type: ${job_type}`);
  }
}

async function handleEmailNotification(supabase: any, payload: any) {
  const { template_name, recipient_email, template_data } = payload;
  if (!template_name || !recipient_email) {
    throw new Error("Missing template_name or recipient_email in payload");
  }

  // Enqueue into the existing email queue via pgmq
  await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: { idempotency_key: `job-${crypto.randomUUID()}`, template_name, recipient_email, ...template_data },
  });
}

async function handleBalanceCharge(supabase: any, payload: any) {
  const { event_id } = payload;
  if (!event_id) throw new Error("Missing event_id in payload");

  // Call the existing charge-remaining-balance function
  const response = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/charge-remaining-balance`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ event_id }),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Balance charge failed: ${errorData}`);
  }
}

async function handleWeatherCheck(supabase: any, payload: any) {
  const { event_id } = payload;

  const response = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/check-weather-alerts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(event_id ? { event_id } : { time: new Date().toISOString() }),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Weather check failed: ${errorData}`);
  }
}

async function handleReportGeneration(supabase: any, payload: any) {
  const { report_type, params } = payload;
  if (!report_type) throw new Error("Missing report_type in payload");

  // Generate report data based on type
  let reportData: any = {};

  switch (report_type) {
    case "revenue_summary": {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_status, payment_type, created_at")
        .eq("payment_status", "completed")
        .gte("created_at", params?.start_date || new Date(Date.now() - 30 * 86400000).toISOString())
        .lte("created_at", params?.end_date || new Date().toISOString());

      reportData = {
        total_revenue: (data || []).reduce((s: number, p: any) => s + Number(p.amount), 0),
        payment_count: (data || []).length,
        generated_at: new Date().toISOString(),
      };
      break;
    }
    case "event_summary": {
      const { data } = await supabase
        .from("events")
        .select("id, title, event_date, location")
        .gte("event_date", params?.start_date || new Date().toISOString().split("T")[0])
        .order("event_date");

      reportData = {
        upcoming_events: (data || []).length,
        events: data || [],
        generated_at: new Date().toISOString(),
      };
      break;
    }
    default:
      throw new Error(`Unknown report type: ${report_type}`);
  }

  // Store the report result back in the job payload for retrieval
  await supabase
    .from("background_jobs")
    .update({ payload: { ...payload, result: reportData } })
    .eq("id", payload.job_id);
}
