import { useState, useEffect, useCallback, useMemo } from "react";
import { format, addDays, addMonths, subMonths, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, isBefore, startOfDay, getDay } from "date-fns";
import { CalendarDays, Plus, MapPin, Clock, Users, ChevronLeft, ChevronRight, Check, X, UserCheck, AlertTriangle, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  crew_needed: number;
  created_by: string;
}

interface Assignment {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
}

interface Availability {
  id: string;
  user_id: string;
  available_date: string;
  is_available: boolean;
  notes: string | null;
}

interface CrewMember {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

const SchedulingPage = () => {
  const { user, role } = useAuth();
  const isOwner = role === "owner";

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendar");

  // Dialog states
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form states
  const [newEvent, setNewEvent] = useState({ title: "", location: "", start_time: "08:00", end_time: "16:00", notes: "", crew_needed: "2" });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month calendar days (padded to fill grid)
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Pad start (Monday = 0 in our grid)
    const startDow = (getDay(monthStart) + 6) % 7; // Convert Sun=0 to Mon=0
    const padBefore = Array.from({ length: startDow }, (_, i) => addDays(monthStart, -(startDow - i)));
    
    // Pad end to fill 6 rows max
    const totalSoFar = padBefore.length + days.length;
    const rows = Math.ceil(totalSoFar / 7);
    const padAfter = Array.from({ length: rows * 7 - totalSoFar }, (_, i) => addDays(monthEnd, i + 1));
    
    return [...padBefore, ...days, ...padAfter];
  }, [currentMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const [eventsRes, assignmentsRes, availabilityRes, crewRes] = await Promise.all([
        supabase.from("events").select("*").gte("event_date", startDate).lte("event_date", endDate).order("event_date"),
        supabase.from("event_assignments").select("*"),
        supabase.from("crew_availability").select("*").gte("available_date", startDate).lte("available_date", endDate),
        isOwner ? supabase.from("profiles").select("user_id, display_name, email") : Promise.resolve({ data: [], error: null }),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      setEvents((eventsRes.data || []) as Event[]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      setAssignments((assignmentsRes.data || []) as Assignment[]);

      if (availabilityRes.error) throw availabilityRes.error;
      setAvailability((availabilityRes.data || []) as Availability[]);

      if (crewRes.error) throw crewRes.error;
      setCrewMembers((crewRes.data || []) as CrewMember[]);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [weekStart, isOwner]);

  // Fetch month events separately
  const fetchMonthEvents = useCallback(async () => {
    try {
      const mStart = format(monthDays[0], "yyyy-MM-dd");
      const mEnd = format(monthDays[monthDays.length - 1], "yyyy-MM-dd");
      const { data, error } = await supabase.from("events").select("*").gte("event_date", mStart).lte("event_date", mEnd).order("event_date");
      if (error) throw error;
      setMonthEvents((data || []) as Event[]);
    } catch (err) {
      console.error("Month fetch error:", err);
    }
  }, [monthDays]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (activeTab === "month") fetchMonthEvents(); }, [activeTab, fetchMonthEvents]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("scheduling")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => { fetchData(); if (activeTab === "month") fetchMonthEvents(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_assignments" }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, fetchMonthEvents, activeTab]);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !selectedDate) return;
    try {
      const { error } = await supabase.from("events").insert({
        title: newEvent.title,
        event_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        location: newEvent.location || null,
        notes: newEvent.notes || null,
        crew_needed: parseInt(newEvent.crew_needed) || 2,
        created_by: user!.id,
      });
      if (error) throw error;
      toast.success("Event created!");
      setCreateEventOpen(false);
      setNewEvent({ title: "", location: "", start_time: "08:00", end_time: "16:00", notes: "", crew_needed: "2" });
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
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Event deleted");
      fetchData();
      if (activeTab === "month") fetchMonthEvents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete event");
    }
  };

  const handleAssignCrew = async (eventId: string, userId: string) => {
    try {
      const existing = assignments.find(a => a.event_id === eventId && a.user_id === userId);
      if (existing) {
        await supabase.from("event_assignments").delete().eq("id", existing.id);
        toast.success("Unassigned");
      } else {
        const { error } = await supabase.from("event_assignments").insert({ event_id: eventId, user_id: userId });
        if (error) throw error;
        toast.success("Crew assigned!");
      }
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update assignment");
    }
  };

  const handleToggleAvailability = async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = availability.find(a => a.available_date === dateStr && a.user_id === user?.id);
    try {
      if (existing) {
        if (existing.is_available) {
          await supabase.from("crew_availability").update({ is_available: false }).eq("id", existing.id);
        } else {
          await supabase.from("crew_availability").delete().eq("id", existing.id);
        }
      } else {
        await supabase.from("crew_availability").insert({
          user_id: user!.id,
          available_date: dateStr,
          is_available: true,
        });
      }
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update availability");
    }
  };

  const getAvailabilityStatus = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const entry = availability.find(a => a.available_date === dateStr && a.user_id === user?.id);
    if (!entry) return "unset";
    return entry.is_available ? "available" : "unavailable";
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(e => e.event_date === dateStr);
  };

  const getMonthEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return monthEvents.filter(e => e.event_date === dateStr);
  };

  const getAssignmentsForEvent = (eventId: string) => {
    return assignments.filter(a => a.event_id === eventId);
  };

  const getCrewName = (userId: string) => {
    const member = crewMembers.find(m => m.user_id === userId);
    return member?.display_name || member?.email?.split("@")[0] || "Unknown";
  };

  const getAvailableCrewForDate = (date: string) => {
    return availability
      .filter(a => a.available_date === date && a.is_available)
      .map(a => a.user_id);
  };

  const today = startOfDay(new Date());

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Crew Scheduling</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOwner ? "Schedule events and assign crew members" : "Mark your availability and view assignments"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarDays size={16} className="mr-1.5" />
            Week View
          </TabsTrigger>
          <TabsTrigger value="month">
            <Calendar size={16} className="mr-1.5" />
            Month View
          </TabsTrigger>
          <TabsTrigger value="availability">
            <UserCheck size={16} className="mr-1.5" />
            My Availability
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="overview">
              <Users size={16} className="mr-1.5" />
              Crew Overview
            </TabsTrigger>
          )}
        </TabsList>

        {/* WEEK VIEW */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft size={16} />
              </Button>
              <span className="font-medium text-sm">
                {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight size={16} />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Today
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading schedule...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isPast = isBefore(day, today);
                const myStatus = getAvailabilityStatus(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "rounded-xl border p-3 min-h-[140px] transition-colors",
                      isToday ? "border-primary bg-primary/5" : "border-border bg-card",
                      isPast && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs text-muted-foreground">{format(day, "EEE")}</span>
                        <span className={cn(
                          "block text-lg font-bold font-display leading-tight",
                          isToday && "text-primary"
                        )}>
                          {format(day, "d")}
                        </span>
                      </div>
                      {myStatus === "available" && (
                        <Badge variant="outline" className="text-[10px] bg-chart-2/10 text-chart-2 border-chart-2/20">Available</Badge>
                      )}
                      {myStatus === "unavailable" && (
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Off</Badge>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {dayEvents.map((evt) => {
                        const evtAssignments = getAssignmentsForEvent(evt.id);
                        const isFull = evtAssignments.length >= evt.crew_needed;
                        return (
                          <motion.div
                            key={evt.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "rounded-lg p-2 text-xs cursor-pointer border transition-colors",
                              isFull
                                ? "bg-chart-2/10 border-chart-2/20"
                                : "bg-primary/10 border-primary/20"
                            )}
                            onClick={() => {
                              if (isOwner) {
                                setSelectedEvent(evt);
                                setAssignDialogOpen(true);
                              }
                            }}
                          >
                            <p className="font-semibold truncate">{evt.title}</p>
                            {evt.start_time && (
                              <p className="text-muted-foreground mt-0.5">
                                {evt.start_time.slice(0, 5)}{evt.end_time ? ` - ${evt.end_time.slice(0, 5)}` : ""}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                              <Users size={10} />
                              <span>{evtAssignments.length}/{evt.crew_needed}</span>
                            </div>
                          </motion.div>
                        );
                      })}

                      {isOwner && !isPast && (
                        <button
                          onClick={() => {
                            setSelectedDate(day);
                            setCreateEventOpen(true);
                          }}
                          className="w-full rounded-lg border border-dashed border-border p-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* MONTH VIEW */}
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
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
              This Month
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dayEvents = getMonthEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const inMonth = isSameMonth(day, currentMonth);
              const isPast = isBefore(day, today);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "rounded-lg border p-1.5 min-h-[90px] transition-colors",
                    isToday ? "border-primary bg-primary/5" : "border-border",
                    !inMonth && "opacity-40 bg-muted/20",
                    inMonth && !isToday && "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-bold font-display",
                      isToday && "text-primary",
                      !inMonth && "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    {isOwner && inMonth && !isPast && (
                      <button
                        onClick={() => {
                          setSelectedDate(day);
                          setCreateEventOpen(true);
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const evtAssignments = getAssignmentsForEvent(evt.id);
                      const isFull = evtAssignments.length >= evt.crew_needed;
                      return (
                        <div
                          key={evt.id}
                          onClick={() => {
                            if (isOwner) {
                              setSelectedEvent(evt);
                              setAssignDialogOpen(true);
                            }
                          }}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer transition-colors",
                            isFull
                              ? "bg-chart-2/15 text-chart-2"
                              : "bg-primary/15 text-primary"
                          )}
                        >
                          {evt.start_time ? `${evt.start_time.slice(0, 5)} ` : ""}{evt.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month summary */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""} this month</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-primary/20" /> Needs crew
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-chart-2/20" /> Fully staffed
            </span>
          </div>
        </TabsContent>

        {/* MY AVAILABILITY */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mark Your Availability</CardTitle>
              <p className="text-xs text-muted-foreground">Click a day to cycle: Available → Unavailable → Unset</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="font-medium text-sm">
                    {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const status = getAvailabilityStatus(day);
                  const isPast = isBefore(day, today);
                  const dayEvents = getEventsForDay(day);
                  const myAssignments = assignments.filter(a =>
                    dayEvents.some(e => e.id === a.event_id) && a.user_id === user?.id
                  );

                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isPast}
                      onClick={() => handleToggleAvailability(day)}
                      className={cn(
                        "rounded-xl border p-4 text-center transition-all",
                        status === "available" && "bg-chart-2/10 border-chart-2/30 text-chart-2",
                        status === "unavailable" && "bg-destructive/10 border-destructive/30 text-destructive",
                        status === "unset" && "bg-card border-border text-foreground hover:border-primary",
                        isPast && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <span className="text-xs text-muted-foreground block">{format(day, "EEE")}</span>
                      <span className="text-xl font-bold font-display block">{format(day, "d")}</span>
                      <span className="text-[10px] mt-1 block font-medium">
                        {status === "available" ? "✓ Available" : status === "unavailable" ? "✗ Off" : "—"}
                      </span>
                      {myAssignments.length > 0 && (
                        <Badge variant="outline" className="mt-1.5 text-[9px]">
                          {myAssignments.length} event{myAssignments.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-chart-2/20 border border-chart-2/30" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" /> Unavailable</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-card border border-border" /> Not Set</span>
              </div>
            </CardContent>
          </Card>

          {/* My upcoming assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">My Assignments This Week</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const myEvents = events.filter(e =>
                  assignments.some(a => a.event_id === e.id && a.user_id === user?.id)
                );
                if (myEvents.length === 0) {
                  return <p className="text-sm text-muted-foreground">No assignments this week.</p>;
                }
                return (
                  <div className="space-y-2">
                    {myEvents.map(evt => (
                      <div key={evt.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <CalendarDays size={16} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{evt.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(evt.event_date), "EEE, MMM d")}
                            {evt.start_time && ` • ${evt.start_time.slice(0, 5)}`}
                            {evt.location && ` • ${evt.location}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20 text-xs">Assigned</Badge>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREW OVERVIEW (Owner only) */}
        {isOwner && (
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Crew Availability This Week</CardTitle>
              </CardHeader>
              <CardContent>
                {crewMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No crew members found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left font-medium p-2 min-w-[120px]">Crew Member</th>
                          {weekDays.map(day => (
                            <th key={day.toISOString()} className="text-center font-medium p-2 min-w-[70px]">
                              <span className="text-xs text-muted-foreground block">{format(day, "EEE")}</span>
                              <span className="text-sm">{format(day, "d")}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {crewMembers.map(member => (
                          <tr key={member.user_id} className="border-b border-border last:border-0">
                            <td className="p-2 font-medium text-sm">{member.display_name || member.email?.split("@")[0]}</td>
                            {weekDays.map(day => {
                              const dateStr = format(day, "yyyy-MM-dd");
                              const entry = availability.find(a => a.available_date === dateStr && a.user_id === member.user_id);
                              const dayAssignments = assignments.filter(a => {
                                const evt = events.find(e => e.id === a.event_id);
                                return evt?.event_date === dateStr && a.user_id === member.user_id;
                              });

                              return (
                                <td key={day.toISOString()} className="p-2 text-center">
                                  {dayAssignments.length > 0 ? (
                                    <Badge className="bg-primary text-primary-foreground text-[10px]">Booked</Badge>
                                  ) : entry?.is_available ? (
                                    <Check size={16} className="text-chart-2 mx-auto" />
                                  ) : entry && !entry.is_available ? (
                                    <X size={16} className="text-destructive mx-auto" />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming events with staffing status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Events Needing Crew</CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events this week.</p>
                ) : (
                  <div className="space-y-2">
                    {events.map(evt => {
                      const evtAssignments = getAssignmentsForEvent(evt.id);
                      const isFull = evtAssignments.length >= evt.crew_needed;
                      const needsMore = evt.crew_needed - evtAssignments.length;

                      return (
                        <div
                          key={evt.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedEvent(evt);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <CalendarDays size={16} className="text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{evt.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(evt.event_date), "EEE, MMM d")}
                              {evt.start_time && ` • ${evt.start_time.slice(0, 5)}`}
                              {evt.location && ` • ${evt.location}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{evtAssignments.length}/{evt.crew_needed}</span>
                            {isFull ? (
                              <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20 text-xs">Staffed</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                                Need {needsMore}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Event Dialog */}
      <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              {selectedDate && `Schedule for ${format(selectedDate, "EEEE, MMMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Event Title *</Label>
              <Input
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Smith Birthday Party"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={newEvent.location}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="e.g., 123 Main St, Springfield"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={newEvent.start_time} onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={newEvent.end_time} onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Crew Needed</Label>
              <Select value={newEvent.crew_needed} onValueChange={v => setNewEvent({ ...newEvent, crew_needed: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} crew member{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newEvent.notes}
                onChange={e => setNewEvent({ ...newEvent, notes: e.target.value })}
                placeholder="Special instructions, equipment needed, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEventOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!newEvent.title}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Crew Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {format(parseISO(selectedEvent.event_date), "EEEE, MMMM d, yyyy")}
                  {selectedEvent.start_time && ` • ${selectedEvent.start_time.slice(0, 5)}`}
                  {selectedEvent.end_time && ` - ${selectedEvent.end_time.slice(0, 5)}`}
                  {selectedEvent.location && (
                    <span className="flex items-center gap-1 mt-1"><MapPin size={12} />{selectedEvent.location}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Crew Needed: {selectedEvent.crew_needed}</span>
                  <span className="text-sm text-muted-foreground">
                    Assigned: {getAssignmentsForEvent(selectedEvent.id).length}/{selectedEvent.crew_needed}
                  </span>
                </div>

                {isOwner && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Click to assign/unassign crew</Label>
                    {crewMembers.map(member => {
                      const isAssigned = assignments.some(a => a.event_id === selectedEvent.id && a.user_id === member.user_id);
                      const isAvailable = getAvailableCrewForDate(selectedEvent.event_date).includes(member.user_id);

                      return (
                        <button
                          key={member.user_id}
                          onClick={() => handleAssignCrew(selectedEvent.id, member.user_id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-sm",
                            isAssigned
                              ? "bg-primary/10 border-primary/30 text-foreground"
                              : "bg-card border-border hover:border-primary"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isAssigned ? <Check size={14} className="text-primary" /> : <Users size={14} className="text-muted-foreground" />}
                            <span>{member.display_name || member.email?.split("@")[0]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAvailable && !isAssigned && (
                              <Badge variant="outline" className="text-[10px] bg-chart-2/10 text-chart-2 border-chart-2/20">Available</Badge>
                            )}
                            {isAssigned && (
                              <Badge className="bg-primary text-primary-foreground text-[10px]">Assigned</Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedEvent.notes && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-semibold">Notes:</span> {selectedEvent.notes}
                  </div>
                )}
              </div>
              <DialogFooter>
                {isOwner && (
                  <Button variant="destructive" size="sm" onClick={() => { handleDeleteEvent(selectedEvent.id); setAssignDialogOpen(false); }}>
                    Delete Event
                  </Button>
                )}
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulingPage;
