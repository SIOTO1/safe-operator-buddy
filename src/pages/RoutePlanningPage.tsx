import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  Plus, Route, Truck, User, CalendarDays, ChevronDown, Trash2, Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import GoogleMap from "@/components/delivery/GoogleMap";
import CreateRouteDialog from "@/components/delivery/CreateRouteDialog";
import RouteStopsManager from "@/components/delivery/RouteStopsManager";

interface RouteRow {
  id: string;
  name: string;
  route_date: string;
  status: string;
  notes: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  company_id: string | null;
  workspace_id: string | null;
  created_by: string;
}

interface DriverRow { id: string; name: string; }
interface VehicleRow { id: string; name: string; license_plate: string | null; }
interface StopRow {
  id: string; route_id: string; event_id: string | null;
  stop_order: number; address: string | null;
  lat: number | null; lng: number | null; notes: string | null;
}

const statusColors: Record<string, string> = {
  planned: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const RoutePlanningPage = () => {
  const { companyId, role } = useAuth();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [routeStops, setRouteStops] = useState<Record<string, StopRow[]>>({});
  const [filterStatus, setFilterStatus] = useState("all");

  const canManage = role === "owner" || role === "manager";

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_routes")
      .select("*")
      .order("route_date", { ascending: true });
    if (error) {
      toast.error("Failed to load routes");
      console.error(error);
    }
    setRoutes((data || []) as unknown as RouteRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoutes();
    supabase.from("drivers").select("id, name").eq("is_active", true).order("name")
      .then(({ data }) => setDrivers((data || []) as unknown as DriverRow[]));
    supabase.from("vehicles").select("id, name, license_plate").eq("is_active", true).order("name")
      .then(({ data }) => setVehicles((data || []) as unknown as VehicleRow[]));
  }, [fetchRoutes]);

  useEffect(() => {
    const ch = supabase
      .channel("route-planning")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_routes" }, () => fetchRoutes())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRoutes]);

  const deleteRoute = async (id: string) => {
    if (!confirm("Delete this route and all its stops?")) return;
    const { error } = await supabase.from("delivery_routes").delete().eq("id", id);
    if (error) toast.error("Failed to delete route");
    else fetchRoutes();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("delivery_routes").update({ status }).eq("id", id);
    fetchRoutes();
  };

  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name || "Unassigned";
  const vehicleName = (id: string | null) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? `${v.name}${v.license_plate ? ` (${v.license_plate})` : ""}` : "Unassigned";
  };

  const filtered = filterStatus === "all" ? routes : routes.filter((r) => r.status === filterStatus);

  // Group by date
  const grouped: Record<string, RouteRow[]> = {};
  filtered.forEach((r) => {
    if (!grouped[r.route_date]) grouped[r.route_date] = [];
    grouped[r.route_date].push(r);
  });
  const sortedDates = Object.keys(grouped).sort();

  const mapStops = expandedRoute && routeStops[expandedRoute]
    ? routeStops[expandedRoute]
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => ({ lat: s.lat!, lng: s.lng!, label: s.address || "", order: s.stop_order }))
    : [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Route Planning</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create delivery routes, assign drivers & vehicles, and optimize stop order
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus size={16} />New Route
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} route{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Routes list */}
        <div className="space-y-6">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Loading routes…</p>
          ) : sortedDates.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No routes found. {canManage ? "Create your first route!" : ""}
            </p>
          ) : (
            sortedDates.map((dateStr) => (
              <div key={dateStr}>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays size={14} className="text-muted-foreground" />
                  <h2 className="text-sm font-semibold">
                    {format(parseISO(dateStr), "EEEE, MMMM d, yyyy")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({grouped[dateStr].length} route{grouped[dateStr].length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[dateStr].map((route) => {
                    const isExpanded = expandedRoute === route.id;
                    return (
                      <Collapsible
                        key={route.id}
                        open={isExpanded}
                        onOpenChange={(o) => setExpandedRoute(o ? route.id : null)}
                      >
                        <Card className={cn("transition-colors", isExpanded && "border-primary/50")}>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="py-3 cursor-pointer hover:bg-accent/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <Route size={16} className="text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">{route.name}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                      <User size={11} />{driverName(route.driver_id)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Truck size={11} />{vehicleName(route.vehicle_id)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={cn("text-[10px]", statusColors[route.status] || "")}>
                                    {route.status.replace("_", " ")}
                                  </Badge>
                                  <ChevronDown size={14} className={cn("transition-transform", isExpanded && "rotate-180")} />
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 space-y-3">
                              {canManage && (
                                <div className="flex gap-2">
                                  <Select
                                    value={route.status}
                                    onValueChange={(v) => updateStatus(route.id, v)}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-[130px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="planned">Planned</SelectItem>
                                      <SelectItem value="in_progress">In Progress</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm" variant="destructive"
                                    className="h-7 text-xs ml-auto"
                                    onClick={() => deleteRoute(route.id)}
                                  >
                                    <Trash2 size={12} className="mr-1" />Delete
                                  </Button>
                                </div>
                              )}
                              {route.notes && (
                                <p className="text-xs text-muted-foreground">{route.notes}</p>
                              )}
                              <RouteStopsManager
                                routeId={route.id}
                                routeDate={route.route_date}
                                onStopsChange={(s) =>
                                  setRouteStops((prev) => ({ ...prev, [route.id]: s }))
                                }
                              />
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Map */}
        <div className="sticky top-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Route Map</CardTitle>
            </CardHeader>
            <CardContent>
              {mapStops.length > 0 ? (
                <GoogleMap stops={mapStops} className="w-full h-[500px] rounded-lg" />
              ) : (
                <div className="w-full h-[500px] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                  Select a route with geocoded stops to view the map
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateRouteDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchRoutes} />
    </div>
  );
};

export default RoutePlanningPage;
