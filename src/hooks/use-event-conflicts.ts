import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConflictWarning {
  type: "equipment" | "route" | "staff";
  severity: "warning" | "error";
  message: string;
  details?: string;
}

interface ConflictCheckParams {
  eventDate: string;
  eventId?: string; // exclude current event when editing
}

export function useEventConflicts() {
  const { companyId } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [checking, setChecking] = useState(false);

  const checkConflicts = useCallback(async ({ eventDate, eventId }: ConflictCheckParams) => {
    if (!eventDate || !companyId) {
      setConflicts([]);
      return [];
    }

    setChecking(true);
    const warnings: ConflictWarning[] = [];

    try {
      // 1. Equipment availability check
      const [availRes, productsRes] = await Promise.all([
        supabase.rpc("get_product_availability", { _company_id: companyId, _date: eventDate }),
        supabase.from("products").select("id, name, quantity_available").eq("company_id", companyId).eq("is_active", true),
      ]);

      if (availRes.data && productsRes.data) {
        const allocations = availRes.data as { product_id: string; units_allocated: number }[];
        const products = productsRes.data;

        // If editing, subtract current event's allocations
        let currentEventProducts: { product_id: string; quantity: number }[] = [];
        if (eventId) {
          const { data: epData } = await supabase
            .from("event_products")
            .select("product_id, quantity")
            .eq("event_id", eventId);
          currentEventProducts = epData || [];
        }

        const overbooked: string[] = [];
        for (const alloc of allocations) {
          const product = products.find(p => p.id === alloc.product_id);
          if (!product) continue;
          
          // Subtract current event's own allocation when editing
          const ownAlloc = currentEventProducts.find(ep => ep.product_id === alloc.product_id);
          const netAllocated = alloc.units_allocated - (ownAlloc?.quantity || 0);
          
          if (netAllocated >= product.quantity_available) {
            overbooked.push(product.name);
          } else if (netAllocated >= product.quantity_available * 0.8) {
            // Near capacity (80%+)
            warnings.push({
              type: "equipment",
              severity: "warning",
              message: `${product.name} is near capacity (${netAllocated}/${product.quantity_available} allocated)`,
            });
          }
        }
        if (overbooked.length > 0) {
          warnings.push({
            type: "equipment",
            severity: "error",
            message: "Equipment inventory may be exceeded for this date.",
            details: `Fully booked: ${overbooked.join(", ")}`,
          });
        }
      }

      // 2. Route capacity check
      const { data: routes } = await supabase
        .from("delivery_routes")
        .select("id, name, route_stops(id)")
        .eq("route_date", eventDate)
        .eq("company_id", companyId);

      if (routes && routes.length > 0) {
        const maxStopsPerRoute = 8;
        const overloaded = routes.filter(r => {
          const stops = Array.isArray(r.route_stops) ? r.route_stops.length : 0;
          return stops >= maxStopsPerRoute;
        });
        if (overloaded.length > 0) {
          warnings.push({
            type: "route",
            severity: "warning",
            message: "Route capacity exceeded.",
            details: `${overloaded.map(r => r.name).join(", ")} ${overloaded.length === 1 ? "has" : "have"} ${maxStopsPerRoute}+ stops`,
          });
        }
        // All routes busy
        if (routes.length >= 3) {
          warnings.push({
            type: "route",
            severity: "warning",
            message: `${routes.length} delivery routes already scheduled for this date.`,
          });
        }
      }

      // 3. Staff assignment check
      const { data: existingEvents } = await supabase
        .from("events")
        .select("id, title, crew_needed")
        .eq("event_date", eventDate)
        .neq("id", eventId || "00000000-0000-0000-0000-000000000000");

      if (existingEvents && existingEvents.length > 0) {
        const { data: employees } = await supabase
          .from("employees")
          .select("id")
          .eq("company_id", companyId)
          .eq("status", "active");

        const totalCrewNeeded = existingEvents.reduce((sum, e) => sum + (e.crew_needed || 2), 0) + 2; // +2 for new event default
        const availableStaff = employees?.length || 0;

        if (totalCrewNeeded > availableStaff) {
          warnings.push({
            type: "staff",
            severity: "warning",
            message: `Staff may be stretched thin. ${totalCrewNeeded} crew needed across ${existingEvents.length + 1} events, but only ${availableStaff} active staff.`,
          });
        }

        if (existingEvents.length >= 3) {
          warnings.push({
            type: "staff",
            severity: "warning",
            message: `${existingEvents.length} other events already on this date.`,
          });
        }
      }
    } catch (err) {
      console.error("Conflict check error:", err);
    } finally {
      setConflicts(warnings);
      setChecking(false);
    }

    return warnings;
  }, [companyId]);

  const clearConflicts = useCallback(() => setConflicts([]), []);

  return { conflicts, checking, checkConflicts, clearConflicts };
}
