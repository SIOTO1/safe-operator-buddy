import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Users, FileText, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { WeatherSafetyBadge } from "@/components/scheduling/WeatherSafetyBadge";
import type { WeatherData } from "@/components/scheduling/WeatherSafetyBadge";
import { getInflatableSafetyLevel } from "@/components/scheduling/WeatherSafetyBadge";

interface EventDetail {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  crew_needed: number;
  created_by: string;
  created_at: string;
}

interface EventEquipment {
  id: string;
  equipment_name: string;
  quantity: number;
  notes: string | null;
}

const SAFETY_TRAINING_LINKS = [
  { label: "Bounce House Setup SOP", sopId: "st-001", description: "Anchoring, inflation, and wind safety" },
  { label: "Tent Anchoring & Wind Safety", sopId: "safety-002", description: "Stakes vs. weights, wind thresholds" },
  { label: "Water Slide Safety", sopId: "st-002", description: "Dual-attendant protocol, water supply" },
  { label: "General Takedown Procedures", sopId: "st-006", description: "Safe deflation and teardown" },
];

const EventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isOwner = role === "owner";
  const canManage = isOwner || role === "manager";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [equipment, setEquipment] = useState<EventEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const [eventRes, equipRes] = await Promise.all([
          supabase.from("events").select("*").eq("id", eventId).single(),
          supabase.from("event_equipment").select("*").eq("event_id", eventId).order("created_at"),
        ]);
        if (eventRes.error) throw eventRes.error;
        setEvent(eventRes.data as EventDetail);
        setEquipment((equipRes.data || []) as EventEquipment[]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleDelete = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId!);
      if (error) throw error;
      toast.success("Event deleted");
      navigate("/dashboard/scheduling");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete event");
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/scheduling")}>Back to Schedule</Button>
      </div>
    );
  }

  const safetyLevel = weatherData?.available
    ? getInflatableSafetyLevel(weatherData.wind_speed || 0, weatherData.wind_gust || null)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/scheduling")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">{event.title}</h1>
            <p className="text-muted-foreground text-sm">{format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>
        {canManage && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 size={14} className="mr-1.5" /> Delete
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Event Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(event.start_time || event.end_time) && (
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-muted-foreground">
                        {event.start_time?.slice(0, 5) || "TBD"} – {event.end_time?.slice(0, 5) || "TBD"}
                      </p>
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Users size={16} className="mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Crew Needed</p>
                    <p className="text-muted-foreground">{event.crew_needed}</p>
                  </div>
                </div>
              </div>

              {event.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1.5"><FileText size={14} /> Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{event.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Equipment */}
          {equipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {equipment.map((eq) => (
                    <div key={eq.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span>{eq.equipment_name}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">×{eq.quantity}</Badge>
                        {eq.notes && <span className="text-xs text-muted-foreground">{eq.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Safety Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Safety Status
                {safetyLevel && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      safetyLevel === "safe" && "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700",
                      safetyLevel === "caution" && "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
                      safetyLevel === "unsafe" && "bg-destructive/10 text-destructive border-destructive/30",
                    )}
                  >
                    {safetyLevel === "safe" && "● Safe"}
                    {safetyLevel === "caution" && "● Caution"}
                    {safetyLevel === "unsafe" && "● Unsafe"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.location ? (
                <WeatherSafetyBadge
                  eventLocation={event.location}
                  eventDate={event.event_date}
                  compact={false}
                  onWeatherLoaded={setWeatherData}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Add a location to check weather safety conditions.</p>
              )}

              <Separator />

              {/* Safety Training Resources */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <BookOpen size={14} /> SIOTO Safety Training
                </p>
                <div className="space-y-1.5">
                  {SAFETY_TRAINING_LINKS.map((link) => (
                    <Link
                      key={link.sopId}
                      to={`/dashboard/sops?article=${link.sopId}`}
                      className="block rounded-md border border-border/60 p-2.5 hover:bg-accent/50 transition-colors group"
                    >
                      <p className="text-xs font-medium group-hover:text-primary transition-colors">{link.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{link.description}</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Wind threshold reference */}
              <div className="rounded-md border border-border/60 p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">Wind Safety Thresholds</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">&lt;15 mph</span> — Safe for inflatable operation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">15–20 mph</span> — Caution, monitor closely</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                    <span className="text-muted-foreground"><span className="font-medium text-foreground">&gt;20 mph</span> — Unsafe, do not operate inflatables</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
