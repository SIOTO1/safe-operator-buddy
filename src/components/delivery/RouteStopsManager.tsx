import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { GripVertical, Plus, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  start_time: string | null;
}

interface StopRow {
  id: string;
  route_id: string;
  event_id: string | null;
  stop_order: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
}

interface RouteStopsManagerProps {
  routeId: string;
  routeDate: string;
  onStopsChange: (stops: StopRow[]) => void;
}

const GEOCODE_API_KEY = "AIzaSyAvgeAk2xd_fiRhSRcRPPAUuNIgfDD58rc";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GEOCODE_API_KEY}`
    );
    const data = await res.json();
    if (data.results?.[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch {}
  return null;
}

const RouteStopsManager = ({ routeId, routeDate, onStopsChange }: RouteStopsManagerProps) => {
  const [stops, setStops] = useState<StopRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [adding, setAdding] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const fetchStops = useCallback(async () => {
    const { data } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("stop_order");
    const s = (data || []) as unknown as StopRow[];
    setStops(s);
    onStopsChange(s);
  }, [routeId, onStopsChange]);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  // Fetch events for the route date that aren't already stops
  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, event_date, location, start_time")
      .eq("event_date", routeDate)
      .order("start_time")
      .then(({ data }) => setEvents((data || []) as unknown as EventRow[]));
  }, [routeDate]);

  const availableEvents = events.filter(
    (e) => !stops.some((s) => s.event_id === e.id)
  );

  const addStop = async () => {
    if (!selectedEventId) return;
    setAdding(true);
    const event = events.find((e) => e.id === selectedEventId);
    let coords: { lat: number; lng: number } | null = null;
    if (event?.location) {
      coords = await geocodeAddress(event.location);
    }

    const { error } = await supabase.from("route_stops").insert({
      route_id: routeId,
      event_id: selectedEventId,
      stop_order: stops.length,
      address: event?.location || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
    if (error) {
      toast.error("Failed to add stop");
    } else {
      setSelectedEventId("");
      await fetchStops();
    }
    setAdding(false);
  };

  const removeStop = async (stopId: string) => {
    await supabase.from("route_stops").delete().eq("id", stopId);
    await fetchStops();
  };

  const reorderStops = async (newOrder: StopRow[]) => {
    const updates = newOrder.map((s, i) => ({ id: s.id, stop_order: i }));
    for (const u of updates) {
      await supabase.from("route_stops").update({ stop_order: u.stop_order }).eq("id", u.id);
    }
    await fetchStops();
  };

  // Simple nearest-neighbor optimization
  const optimizeOrder = async () => {
    const geoStops = stops.filter((s) => s.lat != null && s.lng != null);
    if (geoStops.length < 2) {
      toast.info("Need at least 2 geocoded stops to optimize");
      return;
    }
    setOptimizing(true);

    const remaining = [...geoStops];
    const ordered: StopRow[] = [];
    let current = remaining.shift()!;
    ordered.push(current);

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.hypot(
          (remaining[i].lat! - current.lat!) * 111,
          (remaining[i].lng! - current.lng!) * 111 * Math.cos((current.lat! * Math.PI) / 180)
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      current = remaining.splice(nearestIdx, 1)[0];
      ordered.push(current);
    }

    // Add non-geocoded stops at the end
    const nonGeo = stops.filter((s) => s.lat == null || s.lng == null);
    const final = [...ordered, ...nonGeo];
    await reorderStops(final);
    setOptimizing(false);
    toast.success("Route optimized");
  };

  // Drag and drop
  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const newStops = [...stops];
    const [moved] = newStops.splice(dragIdx, 1);
    newStops.splice(i, 0, moved);
    setStops(newStops);
    onStopsChange(newStops);
    setDragIdx(i);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    reorderStops(stops);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Route Stops</CardTitle>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={optimizeOrder} disabled={optimizing || stops.length < 2}>
              {optimizing ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Optimize
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add stop */}
        <div className="flex gap-2">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="flex-1 h-8 text-sm">
              <SelectValue placeholder={availableEvents.length ? "Select event to add" : "No events available"} />
            </SelectTrigger>
            <SelectContent>
              {availableEvents.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.start_time ? `${e.start_time.slice(0, 5)} — ` : ""}{e.title}
                  {e.location ? ` (${e.location})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addStop} disabled={!selectedEventId || adding}>
            <Plus size={14} className="mr-1" />Add
          </Button>
        </div>

        {/* Stops list */}
        {stops.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No stops added yet</p>
        ) : (
          <div className="space-y-1">
            {stops.map((stop, i) => {
              const event = events.find((e) => e.id === stop.event_id);
              return (
                <div
                  key={stop.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-card hover:bg-accent/30 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <GripVertical size={14} className="text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="text-[10px] w-5 h-5 flex items-center justify-center p-0 shrink-0">
                    {i + 1}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{event?.title || "Unknown event"}</p>
                    {stop.address && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                        <MapPin size={9} />{stop.address}
                      </p>
                    )}
                  </div>
                  {stop.lat != null && (
                    <Badge variant="outline" className="text-[9px] shrink-0">📍</Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeStop(stop.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RouteStopsManager;
