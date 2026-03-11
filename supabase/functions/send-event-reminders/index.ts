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

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Calculate target dates
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split("T")[0];

    const in1Day = new Date(now);
    in1Day.setDate(in1Day.getDate() + 1);
    const in1DayStr = in1Day.toISOString().split("T")[0];

    // Determine which reminder types to send based on current hour (UTC)
    const currentHour = now.getUTCHours();
    const reminderTargets: { date: string; type: "3_day" | "1_day" | "morning" }[] = [];

    // 3-day and 1-day reminders: send during morning check (6-10 UTC)
    if (currentHour >= 6 && currentHour < 10) {
      reminderTargets.push({ date: in3DaysStr, type: "3_day" });
      reminderTargets.push({ date: in1DayStr, type: "1_day" });
      reminderTargets.push({ date: today, type: "morning" });
    }

    if (reminderTargets.length === 0) {
      return new Response(JSON.stringify({ message: "Outside reminder window" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all target dates
    const targetDates = [...new Set(reminderTargets.map((t) => t.date))];

    // Fetch events for all target dates
    const { data: events, error: eventsErr } = await supabase
      .from("events")
      .select("id, title, event_date, start_time, end_time, location")
      .in("event_date", targetDates);

    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No events to remind", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventIds = events.map((e) => e.id);

    // Fetch booking requests to get customer emails (parallel)
    const [bookingsRes, productsRes, paymentsRes] = await Promise.all([
      supabase
        .from("booking_requests")
        .select("event_id, customer_name, customer_email")
        .in("event_id", eventIds)
        .eq("status", "approved"),
      supabase
        .from("event_products")
        .select("event_id, quantity, product:products(name)")
        .in("event_id", eventIds),
      supabase
        .from("payments")
        .select("event_id, amount, payment_status, payment_type")
        .in("event_id", eventIds),
    ]);

    const bookings = bookingsRes.data || [];
    const products = productsRes.data || [];
    const payments = paymentsRes.data || [];

    // Check which reminders have already been sent today to prevent duplicates
    const { data: sentToday } = await supabase
      .from("email_send_log")
      .select("recipient_email, template_name")
      .like("template_name", "event_reminder_%")
      .gte("created_at", `${today}T00:00:00Z`);

    const sentSet = new Set(
      (sentToday || []).map((s) => `${s.recipient_email}:${s.template_name}`)
    );

    let enqueued = 0;

    for (const target of reminderTargets) {
      const dateEvents = events.filter((e) => e.event_date === target.date);

      for (const event of dateEvents) {
        // Find booking with customer email
        const booking = bookings.find((b) => b.event_id === event.id);
        if (!booking?.customer_email) continue;

        // Dedup check
        const dedupKey = `${booking.customer_email}:event_reminder_${target.type}`;
        if (sentSet.has(dedupKey)) continue;

        // Get products for this event
        const eventProducts = products
          .filter((p) => p.event_id === event.id)
          .map((p) => {
            const productName = (p as any).product?.name || "Unknown";
            return p.quantity > 1 ? `${productName} (x${p.quantity})` : productName;
          });

        // Calculate remaining balance
        const eventPayments = payments.filter((p) => p.event_id === event.id);
        const totalPaid = eventPayments
          .filter((p) => p.payment_status === "completed")
          .reduce((sum, p) => sum + Number(p.amount), 0);

        // Estimate total from deposit (deposit = 25%, so total = deposit / 0.25)
        const depositPayment = eventPayments.find(
          (p) => p.payment_type === "deposit" && p.payment_status === "completed"
        );
        const estimatedTotal = depositPayment ? Number(depositPayment.amount) / 0.25 : totalPaid;
        const remainingBalance = Math.max(0, estimatedTotal - totalPaid);

        // Format time
        const formatTime = (t: string | null) => (t ? t.slice(0, 5) : undefined);

        // Format date nicely
        const eventDateObj = new Date(event.event_date + "T12:00:00Z");
        const formattedDate = eventDateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Enqueue via send-transactional-email pattern (direct enqueue)
        const messageId = crypto.randomUUID();
        const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: booking.customer_email,
            from: "SIOTO <noreply@notify.sioto.com>",
            sender_domain: "notify.sioto.com",
            subject:
              target.type === "morning"
                ? `Today's the Day! — ${event.title}`
                : target.type === "1_day"
                ? `Tomorrow: ${event.title}`
                : `Upcoming Event: ${event.title} — 3 Days Away`,
            html: "__RENDER_TEMPLATE__",
            purpose: "transactional",
            label: `event_reminder_${target.type}`,
            queued_at: new Date().toISOString(),
            // Template data for rendering
            _template: "event_reminder",
            _template_data: {
              customer_name: booking.customer_name,
              event_date: formattedDate,
              event_time: formatTime(event.start_time),
              event_end_time: formatTime(event.end_time),
              location: event.location || "TBD",
              products: eventProducts,
              remaining_balance: remainingBalance,
              reminder_type: target.type,
            },
          },
        });

        if (enqueueErr) {
          console.error("Failed to enqueue reminder:", enqueueErr);
          continue;
        }

        sentSet.add(dedupKey);
        enqueued++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: enqueued,
        targets: reminderTargets.map((t) => `${t.type}: ${t.date}`),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-event-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
