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

    // Rate limit: 5 reschedule attempts per minute per token
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

    const eventId = portalToken.event_id;

    // Fetch the event and its products
    const [eventRes, eventProductsRes] = await Promise.all([
      supabaseAdmin.from("events").select("*").eq("id", eventId).single(),
      supabaseAdmin.from("event_products").select("product_id, quantity").eq("event_id", eventId),
    ]);

    if (eventRes.error || !eventRes.data) throw new Error("Event not found");

    const event = eventRes.data;
    const eventProducts = eventProductsRes.data || [];

    // Check product availability for the new date
    // For each product, count how many are already booked on the new date (excluding this event)
    const unavailableProducts: string[] = [];

    if (eventProducts.length > 0) {
      const productIds = eventProducts.map((ep: any) => ep.product_id);

      // Get product details
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name, quantity_available")
        .in("id", productIds);

      // Get all events on the new date (excluding current event)
      const { data: conflictingEvents } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("event_date", new_date)
        .neq("id", eventId);

      if (conflictingEvents && conflictingEvents.length > 0) {
        const conflictingEventIds = conflictingEvents.map((e: any) => e.id);

        // Get booked quantities for those events
        const { data: bookedProducts } = await supabaseAdmin
          .from("event_products")
          .select("product_id, quantity")
          .in("event_id", conflictingEventIds);

        // Aggregate booked quantities by product
        const bookedMap: Record<string, number> = {};
        (bookedProducts || []).forEach((bp: any) => {
          bookedMap[bp.product_id] = (bookedMap[bp.product_id] || 0) + bp.quantity;
        });

        // Check each product this event needs
        for (const ep of eventProducts) {
          const product = (products || []).find((p: any) => p.id === ep.product_id);
          if (!product) continue;
          const alreadyBooked = bookedMap[ep.product_id] || 0;
          const available = product.quantity_available - alreadyBooked;
          if (available < ep.quantity) {
            unavailableProducts.push(
              `${product.name} (need ${ep.quantity}, only ${Math.max(0, available)} available)`
            );
          }
        }
      }
    }

    if (unavailableProducts.length > 0) {
      return new Response(JSON.stringify({
        error: "Some products are not available on the requested date",
        unavailable: unavailableProducts,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Check route conflicts — see if there's already a delivery route on this date
    // that references this event via route_stops
    const { data: existingRoutes } = await supabaseAdmin
      .from("delivery_routes")
      .select("id, name")
      .eq("route_date", new_date);

    const routeConflict = existingRoutes && existingRoutes.length > 0;

    // Update the event date
    const oldDate = event.event_date;
    const { error: updateError } = await supabaseAdmin
      .from("events")
      .update({ event_date: new_date })
      .eq("id", eventId);

    if (updateError) throw new Error("Failed to update event date");

    // Update the linked booking_request if exists
    await supabaseAdmin
      .from("booking_requests")
      .update({ event_date: new_date })
      .eq("event_id", eventId);

    // Get the customer name for the notification
    const { data: booking } = await supabaseAdmin
      .from("booking_requests")
      .select("customer_name")
      .eq("event_id", eventId)
      .maybeSingle();

    const customerName = booking?.customer_name || "A customer";

    // Notify all owners/managers via notifications table
    const { data: ownerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["owner", "manager"]);

    if (ownerRoles && ownerRoles.length > 0) {
      const notifications = ownerRoles.map((r: any) => ({
        user_id: r.user_id,
        title: "Event Rescheduled",
        message: `${customerName} rescheduled "${event.title}" from ${oldDate} to ${new_date}${routeConflict ? ". Note: delivery routes exist on the new date — review may be needed." : ""}`,
        type: "reschedule",
        severity: routeConflict ? "warning" : "info",
        event_id: eventId,
      }));

      await supabaseAdmin.from("notifications").insert(notifications);
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
