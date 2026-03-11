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
    const { token, new_date } = await req.json();
    if (!token || !new_date) throw new Error("Missing required fields");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limit
    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      _identifier: token,
      _action: "reschedule_event",
      _max_requests: 5,
      _window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many reschedule attempts. Please wait a moment." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(new_date)) throw new Error("Invalid date format");

    const requestedDate = new Date(new_date + "T00:00:00Z");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) throw new Error("Requested date must be in the future");

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

    const eventId = portalToken.event_id;

    // Use atomic reschedule RPC with row-level locking
    const { data: result, error: rpcError } = await supabaseAdmin.rpc("atomic_reschedule_event", {
      _event_id: eventId,
      _new_date: new_date,
    });

    if (rpcError) throw new Error("Failed to reschedule: " + rpcError.message);

    if (result?.error) {
      if (result.error === "Products unavailable") {
        return new Response(JSON.stringify({
          error: "Some products are not available on the requested date",
          unavailable: result.unavailable,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        });
      }
      throw new Error(result.error);
    }

    const oldDate = result.old_date;

    // Check route conflicts on new date
    const { data: existingRoutes } = await supabaseAdmin
      .from("delivery_routes")
      .select("id, name")
      .eq("route_date", new_date);

    const routeConflict = existingRoutes && existingRoutes.length > 0;

    // Get event title for notifications
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("title, company_id")
      .eq("id", eventId)
      .single();

    // Get customer name
    const { data: booking } = await supabaseAdmin
      .from("booking_requests")
      .select("customer_name")
      .eq("event_id", eventId)
      .maybeSingle();

    const customerName = booking?.customer_name || "A customer";
    const eventTitle = event?.title || "Event";

    // Notify owners/managers scoped to this event's company
    const companyId = event?.company_id;
    if (companyId) {
      const { data: companyProfiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("company_id", companyId);

      if (companyProfiles && companyProfiles.length > 0) {
        const userIds = companyProfiles.map((p: any) => p.user_id);

        const { data: ownerRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("user_id", userIds)
          .in("role", ["owner", "manager"]);

        if (ownerRoles && ownerRoles.length > 0) {
          const notifications = ownerRoles.map((r: any) => ({
            user_id: r.user_id,
            title: "Event Rescheduled",
            message: `${customerName} rescheduled "${eventTitle}" from ${oldDate} to ${new_date}${routeConflict ? ". Note: delivery routes exist on the new date — review may be needed." : ""}`,
            type: "reschedule",
            severity: routeConflict ? "warning" : "info",
            event_id: eventId,
          }));

          await supabaseAdmin.from("notifications").insert(notifications);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      new_date,
      route_warning: routeConflict
        ? "There are existing delivery routes on this date. The company will review and adjust if needed."
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
