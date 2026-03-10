import { useState, useEffect, useCallback, useMemo } from "react";
import {
  format, addDays, addMonths, subMonths, startOfWeek, startOfMonth,
  endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO,
  startOfDay, getDay,
} from "date-fns";
import {
  CalendarDays, Calendar, ChevronLeft, ChevronRight, List, MapPin,
  Clock, Package, User,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_by: string;
}

interface EquipmentRow {
  id: string;
  event_id: string;
  equipment_name: string;
  quantity: number;
  notes: string | null;
}

interface Workspace {
  id: string;
  name: string;
}

// Parse customer name from notes field (convention: "Customer: Name\n...")
const parseCustomerFromNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  const match = notes.match(/^Customer:\s*(.+)$/m);
  return match ? match[1].trim() : null;
};

const DeliverySchedulePage = () => {
  const { companyId, workspaceId } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");

  // Filters
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterWorkspace, setFilterWorkspace] = useState<string>(workspaceId || "all");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Calendar nav
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Fetch workspaces
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("workspaces")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name")
      .then(({ data }) => setWorkspaces((data as unknown as Workspace[]) || []));
  }, [companyId]);

  // Sync workspace filter with global workspace
  useEffect(() => {
    setFilterWorkspace(workspaceId || "all");
  }, [workspaceId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: eventsErr } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (eventsErr) throw eventsErr;

      const eventsList = (eventsData || []) as unknown as EventRow[];
      setEvents(eventsList);

      // Fetch equipment for all events
      if (eventsList.length > 0) {
        const eventIds = eventsList.map((e) => e.id);
        const { data: eqData } = await supabase
          .from("event_equipment")
          .select("*")
          .in("event_id", eventIds);
        setEquipment((eqData || []) as unknown as EquipmentRow[]);
      } else {
        setEquipment([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load delivery schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("delivery-schedule")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_equipment" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const getEquipmentForEvent = (eventId: string) =>
    equipment.filter((eq) => eq.event_id === eventId);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let result = events;
    if (filterDate) {
      const dateStr = format(filterDate, "yyyy-MM-dd");
      result = result.filter((e) => e.event_date === dateStr);
    }
    // workspace filtering would apply if events had workspace_id — currently not in old schema
    return result;
  }, [events, filterDate, filterWorkspace]);

  // Group events by date for list view
  const groupedByDate = useMemo(() => {
    const groups: Record<string, EventRow[]> = {};
    filteredEvents.forEach((ev) => {
      if (!groups[ev.event_date]) groups[ev.event_date] = [];
      groups[ev.event_date].push(ev);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  // Month calendar days
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

  const getMonthEventsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredEvents.filter((e) => e.event_date === dateStr);
  };

  const today = startOfDay(new Date());

  const clearFilters = () => {
    setFilterDate(undefined);
    setFilterWorkspace("all");
  };

  const hasFilters = !!filterDate || filterWorkspace !== "all";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Delivery Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View all scheduled events, equipment, and delivery details
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filters:</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5", filterDate && "border-primary text-primary")}>
                <CalendarDays size={14} />
                {filterDate ? format(filterDate, "MMM d, yyyy") : "Any Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {workspaces.length > 0 && (
            <Select value={filterWorkspace} onValueChange={setFilterWorkspace}>
              <SelectTrigger className="h-8 w-[160px] text-sm">
                <SelectValue placeholder="All Workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Clear filters
            </Button>
          )}

          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </span>
        </CardContent>
      </Card>

      {/* Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <List size={16} className="mr-1.5" />List
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar size={16} className="mr-1.5" />Calendar
          </TabsTrigger>
        </TabsList>

        {/* ── List View ── */}
        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading schedule...</div>
          ) : groupedByDate.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No events found{hasFilters ? " for the selected filters" : ""}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([dateStr, dayEvents]) => {
                const date = parseISO(dateStr);
                const isToday = isSameDay(date, today);
                return (
                  <div key={dateStr}>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                        {format(date, "EEEE, MMMM d, yyyy")}
                      </h2>
                      {isToday && (
                        <Badge variant="outline" className="text-[10px] border-primary text-primary">Today</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dayEvents.map((ev, i) => {
                        const eqItems = getEquipmentForEvent(ev.id);
                        const customer = parseCustomerFromNotes(ev.notes);
                        return (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <Card className="hover:border-primary/40 transition-colors">
                              <CardContent className="py-4">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <p className="font-semibold text-sm">{ev.title}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      {(ev.start_time || ev.end_time) && (
                                        <span className="flex items-center gap-1">
                                          <Clock size={12} />
                                          {ev.start_time?.slice(0, 5) || "—"}
                                          {ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}
                                        </span>
                                      )}
                                      {customer && (
                                        <span className="flex items-center gap-1">
                                          <User size={12} />{customer}
                                        </span>
                                      )}
                                      {ev.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin size={12} />{ev.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Equipment */}
                                  <div className="flex flex-wrap gap-1.5 sm:max-w-[260px]">
                                    {eqItems.length > 0 ? (
                                      eqItems.map((eq) => (
                                        <Badge key={eq.id} variant="secondary" className="text-[11px] gap-1">
                                          <Package size={10} />
                                          {eq.equipment_name}
                                          {eq.quantity > 1 && <span className="text-muted-foreground">×{eq.quantity}</span>}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">No equipment</span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Calendar View ── */}
        <TabsContent value="calendar" className="space-y-4">
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
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
                Today
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">
                {d}
              </div>
            ))}
            {monthDays.map((day) => {
              const dayEvents = getMonthEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "bg-card min-h-[90px] p-1.5 cursor-pointer hover:bg-accent/30 transition-colors",
                    !isCurrentMonth && "opacity-40",
                  )}
                  onClick={() => {
                    setFilterDate(day);
                    setActiveTab("list");
                  }}
                >
                  <span className={cn(
                    "text-xs",
                    isToday
                      ? "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold"
                      : "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 truncate">
                        {ev.start_time ? `${ev.start_time.slice(0, 5)} ` : ""}{ev.title}
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
    </div>
  );
};

export default DeliverySchedulePage;
