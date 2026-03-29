import { createClient } from "npm:@supabase/supabase-js@2";
import { render } from "npm:@react-email/render@0.0.12";
import { EventReminderEmail } from "../_shared/email-templates/event-reminder.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_DOMAIN = "notify.sioto.com";

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

    // Send all reminder types in morning window
    const reminderTargets: { date: string; type: "3_day" | "1_day" | "morning" }[] = [
      { date: in3DaysStr, type: "3_day" },
      { date: in1DayStr, type: "1_day" },
      { date: today, type: "morning" },
    ];

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

    // Fetch related data in parallel
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

    // Dedup: check which reminders already sent today
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
        const booking = bookings.find((b) => b.event_id === event.id);
        if (!booking?.customer_email) continue;

        // Dedup
        const dedupKey = `${booking.customer_email}:event_reminder_${target.type}`;
        if (sentSet.has(dedupKey)) continue;

        // Products for this event
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
        const depositPayment = eventPayments.find(
          (p) => p.payment_type === "deposit" && p.payment_status === "completed"
        );
        const estimatedTotal = depositPayment ? Number(depositPayment.amount) / 0.25 : totalPaid;
        const remainingBalance = Math.max(0, estimatedTotal - totalPaid);

        // Format
        const formatTime = (t: string | null) => (t ? t.slice(0, 5) : undefined);
        const eventDateObj = new Date(event.event_date + "T12:00:00Z");
        const formattedDate = eventDateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Render email HTML
        const templateData = {
          customer_name: booking.customer_name,
          event_date: formattedDate,
          event_time: formatTime(event.start_time),
          event_end_time: formatTime(event.end_time),
          location: event.location || "TBD",
          products: eventProducts,
          remaining_balance: remainingBalance,
          reminder_type: target.type,
        };

        const html = render(EventReminderEmail(templateData));
        const subject =
          target.type === "morning"
            ? `Today's the Day! — ${event.title}`
            : target.type === "1_day"
            ? `Tomorrow: ${event.title}`
            : `Upcoming Event: ${event.title} — 3 Days Away`;

        const messageId = crypto.randomUUID();
        const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            run_id: crypto.randomUUID(),
            message_id: messageId,
            to: booking.customer_email,
            from: `SIOTO <noreply@${SENDER_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text: subject,
            purpose: "transactional",
            label: `event_reminder_${target.type}`,
            queued_at: new Date().toISOString(),
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
