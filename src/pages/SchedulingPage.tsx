import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, addMonths, subMonths, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, isBefore, startOfDay, getDay } from "date-fns";
import { CalendarDays, Plus, MapPin, Clock, ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react";
import { WeatherSafetyBadge } from "@/components/scheduling/WeatherSafetyBadge";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  company_id: string | null;
  workspace_id: string | null;
  lead_id: string | null;
}

const SchedulingPage = () => {
  const { user, role, companyId } = useAuth();
  const isOwner = role === "owner";
  const isManager = role === "manager";
  const canManage = isOwner || isManager;

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendar");
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);

  // Dialog states
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form states
  const [newEvent, setNewEvent] = useState({
    event_name: "", location_address: "", city: "", state: "", zip: "",
    start_time: "08:00", end_time: "16:00", notes: "",
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentMonth);
    const me = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: ms, end: me });
    const startDow = (getDay(ms) + 6) % 7;
    const padBefore = Array.from({ length: startDow }, (_, i) => addDays(ms, -(startDow - i)));
    const totalSoFar = padBefore.length + days.length;
    const rows = Math.ceil(totalSoFar / 7);
    const padAfter = Array.from({ length: rows * 7 - totalSoFar }, (_, i) => addDays(me, i + 1));
    return [...padBefore, ...days, ...padAfter];
  }, [currentMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("events" as any).select("*")
        .gte("event_date", startDate).lte("event_date", endDate)
        .order("event_date");
      if (error) throw error;
      setEvents((data || []) as unknown as Event[]);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  const fetchMonthEvents = useCallback(async () => {
    try {
      const mStart = format(monthDays[0], "yyyy-MM-dd");
      const mEnd = format(monthDays[monthDays.length - 1], "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("events" as any).select("*")
        .gte("event_date", mStart).lte("event_date", mEnd)
        .order("event_date");
      if (error) throw error;
      setMonthEvents((data || []) as unknown as Event[]);
    } catch (err) {
      console.error("Month fetch error:", err);
    }
  }, [monthDays]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (activeTab === "month") fetchMonthEvents(); }, [activeTab, fetchMonthEvents]);

  useEffect(() => {
    const channel = supabase
      .channel("scheduling")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchData();
        if (activeTab === "month") fetchMonthEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, fetchMonthEvents, activeTab]);

  const handleCreateEvent = async () => {
    if (!newEvent.event_name || !selectedDate) return;
    try {
      const { error } = await supabase.from("events" as any).insert({
        event_name: newEvent.event_name,
        event_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        location_address: newEvent.location_address || null,
        city: newEvent.city || null,
        state: newEvent.state || null,
        zip: newEvent.zip || null,
        notes: newEvent.notes || null,
        company_id: companyId,
      } as any);
      if (error) throw error;
      toast.success("Event created!");
      setCreateEventOpen(false);
      setNewEvent({ event_name: "", location_address: "", city: "", state: "", zip: "", start_time: "08:00", end_time: "16:00", notes: "" });
      fetchData();
      if (activeTab === "month") fetchMonthEvents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("events" as any).delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Event deleted");
      fetchData();
      if (activeTab === "month") fetchMonthEvents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete event");
    }
  };

  const handleRescheduleEvent = async (eventId: string, newDate: string) => {
    try {
      const { error } = await supabase.from("events" as any).update({ event_date: newDate } as any).eq("id", eventId);
      if (error) throw error;
      toast.success("Event rescheduled!");
      fetchData();
      if (activeTab === "month") fetchMonthEvents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reschedule event");
    }
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(e => e.event_date === dateStr);
  };

  const getMonthEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return monthEvents.filter(e => e.event_date === dateStr);
  };

  const today = startOfDay(new Date());

  const formatLocation = (ev: Event) => {
    const parts = [ev.location_address, ev.city, ev.state, ev.zip].filter(Boolean);
    return parts.join(", ") || null;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Event Scheduling</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {canManage ? "Schedule and manage party rental events" : "View scheduled events"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarDays size={16} className="mr-1.5" />Week View
          </TabsTrigger>
          <TabsTrigger value="month">
            <Calendar size={16} className="mr-1.5" />Month View
          </TabsTrigger>
        </TabsList>

        {/* ── Week View ── */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft size={16} />
              </Button>
              <span className="font-medium text-sm min-w-[180px] text-center">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, today);
                const isPast = isBefore(day, today);
                const dateStr = format(day, "yyyy-MM-dd");

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "min-h-[180px] rounded-lg border p-2 transition-colors",
                      isToday && "border-primary bg-primary/5",
                      isPast && "opacity-60",
                      dropTargetDate === dateStr && "border-primary bg-primary/10",
                    )}
                    onDragOver={(e) => {
                      if (!isOwner) return;
                      e.preventDefault();
                      setDropTargetDate(dateStr);
                    }}
                    onDragLeave={() => setDropTargetDate(null)}
                    onDrop={() => {
                      if (draggedEventId && isOwner) {
                        handleRescheduleEvent(draggedEventId, dateStr);
                      }
                      setDraggedEventId(null);
                      setDropTargetDate(null);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                        {format(day, "EEE d")}
                      </span>
                      {canManage && !isPast && (
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => { setSelectedDate(day); setCreateEventOpen(true); }}
                        >
                          <Plus size={12} />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <AnimatePresence>
                        {dayEvents.map((ev) => (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            draggable={isOwner}
                            onDragStart={() => setDraggedEventId(ev.id)}
                            className={cn(
                              "p-2 rounded-md text-xs border cursor-pointer transition-shadow hover:shadow-sm",
                              "bg-card border-border",
                              isOwner && "cursor-grab active:cursor-grabbing"
                            )}
                          >
                            <p className="font-medium truncate">{ev.event_name}</p>
                            {(ev.start_time || ev.end_time) && (
                              <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock size={10} />
                                {ev.start_time?.slice(0, 5)}{ev.end_time ? `–${ev.end_time.slice(0, 5)}` : ""}
                              </p>
                            )}
                            {formatLocation(ev) && (
                              <p className="text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                <MapPin size={10} />
                                {ev.city || ev.location_address}
                              </p>
                            )}
                            <WeatherSafetyBadge
                              eventLocation={formatLocation(ev)}
                              eventDate={ev.event_date}
                              compact
                            />
                            {canManage && (
                              <Button
                                variant="ghost" size="icon" className="h-4 w-4 mt-1"
                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                              >
                                <Trash2 size={10} />
                              </Button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Month View ── */}
        <TabsContent value="month" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft size={16} />
              </Button>
              <span className="font-medium text-sm min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">{d}</div>
            ))}
            {monthDays.map((day) => {
              const dayEvents = getMonthEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "bg-card min-h-[80px] p-1.5",
                    !isCurrentMonth && "opacity-40",
                  )}
                >
                  <span className={cn("text-xs", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 truncate">
                        {ev.event_name}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Event Dialog */}
      <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
            <DialogDescription>
              {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Event Name *</Label>
              <Input value={newEvent.event_name} onChange={(e) => setNewEvent({ ...newEvent, event_name: e.target.value })} placeholder="e.g. Johnson Birthday Party" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={newEvent.start_time} onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={newEvent.end_time} onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={newEvent.location_address} onChange={(e) => setNewEvent({ ...newEvent, location_address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input value={newEvent.city} onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })} placeholder="Dallas" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={newEvent.state} onChange={(e) => setNewEvent({ ...newEvent, state: e.target.value })} placeholder="TX" />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={newEvent.zip} onChange={(e) => setNewEvent({ ...newEvent, zip: e.target.value })} placeholder="75001" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} placeholder="Special instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEventOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!newEvent.event_name}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulingPage;
