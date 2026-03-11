import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanySlug } from "@/hooks/use-company-slug";
import {
  format, addDays, addMonths, subMonths, addWeeks, subWeeks,
  startOfWeek, startOfMonth, endOfMonth, startOfDay,
  eachDayOfInterval, eachHourOfInterval,
  isSameDay, isSameMonth, parseISO, getDay, isToday,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  products: { name: string; quantity: number }[];
  status: "upcoming" | "today" | "past";
}

type ViewMode = "month" | "week" | "day";

const EventCalendarPage = () => {
  const navigate = useNavigate();
  const { basePath } = useCompanySlug();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived date ranges
  const dateRange = useMemo(() => {
    if (view === "month") {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start: ms, end: me });
      const startDow = (getDay(ms) + 6) % 7;
      const padBefore = Array.from({ length: startDow }, (_, i) => addDays(ms, -(startDow - i)));
      const total = padBefore.length + days.length;
      const rows = Math.ceil(total / 7);
      const padAfter = Array.from({ length: rows * 7 - total }, (_, i) => addDays(me, i + 1));
      return { days: [...padBefore, ...days, ...padAfter], start: padBefore[0] || ms, end: padAfter[padAfter.length - 1] || me };
    }
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      return { days, start: days[0], end: days[6] };
    }
    // day
    return { days: [startOfDay(currentDate)], start: currentDate, end: currentDate };
  }, [view, currentDate]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startStr = format(dateRange.start, "yyyy-MM-dd");
      const endStr = format(dateRange.end, "yyyy-MM-dd");
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("id, title, event_date, start_time, end_time, location, notes")
        .gte("event_date", startStr)
        .lte("event_date", endStr)
        .order("event_date")
        .order("start_time");
      if (error) throw error;

      // Fetch products for these events
      const eventIds = (eventsData || []).map((e) => e.id);
      let productsMap: Record<string, { name: string; quantity: number }[]> = {};
      if (eventIds.length > 0) {
        const { data: epData } = await supabase
          .from("event_products")
          .select("event_id, quantity, products(name)")
          .in("event_id", eventIds);
        if (epData) {
          epData.forEach((ep: any) => {
            if (!productsMap[ep.event_id]) productsMap[ep.event_id] = [];
            productsMap[ep.event_id].push({ name: ep.products?.name || "Unknown", quantity: ep.quantity });
          });
        }
      }

      const today = startOfDay(new Date());
      const mapped: CalendarEvent[] = (eventsData || []).map((e) => {
        const eventDay = parseISO(e.event_date);
        let status: CalendarEvent["status"] = "upcoming";
        if (isSameDay(eventDay, today)) status = "today";
        else if (eventDay < today) status = "past";
        return { ...e, products: productsMap[e.id] || [], status };
      });

      setEvents(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("event-calendar")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_products" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  const navigate_prev = () => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, -1));
  };
  const navigate_next = () => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: Date) => events.filter((e) => isSameDay(parseISO(e.event_date), day));

  const extractCustomerName = (event: CalendarEvent) => {
    // Try to extract customer name from title (format: "Customer Name - Rental") or notes
    const titleMatch = event.title?.match(/^(.+?)\s*[-–—]/);
    if (titleMatch) return titleMatch[1].trim();
    const noteMatch = event.notes?.match(/Customer:\s*(.+?)[\s(]/);
    if (noteMatch) return noteMatch[1].trim();
    return event.title;
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`;
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [view, currentDate]);

  const statusColor = (status: CalendarEvent["status"]) => {
    if (status === "today") return "border-l-primary bg-primary/5";
    if (status === "past") return "border-l-muted-foreground/40 bg-muted/30 opacity-60";
    return "border-l-success bg-success/5";
  };

  const statusBadge = (status: CalendarEvent["status"]) => {
    if (status === "today") return <Badge className="text-[9px] bg-primary text-primary-foreground">Today</Badge>;
    if (status === "past") return <Badge variant="secondary" className="text-[9px]">Past</Badge>;
    return <Badge variant="outline" className="text-[9px] border-success/50 text-success">Upcoming</Badge>;
  };

  const EventCard = ({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) => {
    const customer = extractCustomerName(event);
    return (
      <button
        onClick={() => navigate(`${basePath}/scheduling/${event.id}`)}
        className={cn(
          "w-full text-left rounded-md border-l-[3px] px-2 py-1.5 transition-colors hover:bg-accent/50 cursor-pointer",
          statusColor(event.status),
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium truncate">{customer}</span>
          {!compact && statusBadge(event.status)}
        </div>
        {event.start_time && (
          <span className="text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <Clock size={compact ? 8 : 10} />
            {formatTime(event.start_time)}
            {event.end_time && ` – ${formatTime(event.end_time)}`}
          </span>
        )}
        {!compact && event.products.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <Package size={10} />
            <span className="truncate">{event.products.map((p) => `${p.name} ×${p.quantity}`).join(", ")}</span>
          </div>
        )}
        {compact && event.products.length > 0 && (
          <span className="text-muted-foreground">
            <Package size={8} className="inline mr-0.5" />{event.products.length}
          </span>
        )}
      </button>
    );
  };

  // ---- MONTH VIEW ----
  const MonthView = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-wider font-medium text-muted-foreground py-2 border-b border-border">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dateRange.days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] border-b border-r border-border p-1 transition-colors",
                !inMonth && "bg-muted/20",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full",
                isToday(day) && "bg-primary text-primary-foreground",
                !inMonth && "text-muted-foreground/50"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventCard key={ev.id} event={ev} compact />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[9px] text-muted-foreground text-center">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- WEEK VIEW ----
  const WeekView = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="grid grid-cols-7">
        {dateRange.days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div key={i} className={cn("border-r border-border last:border-r-0", isToday(day) && "bg-primary/5")}>
              <div className={cn(
                "text-center py-3 border-b border-border bg-muted/30",
              )}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, "EEE")}</p>
                <p className={cn(
                  "text-lg font-display font-bold mt-0.5",
                  isToday(day) ? "text-primary" : "text-foreground"
                )}>
                  {format(day, "d")}
                </p>
              </div>
              <div className="p-1.5 space-y-1 min-h-[300px]">
                {dayEvents.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/40 text-center pt-8">No events</p>
                )}
                {dayEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- DAY VIEW ----
  const DayView = () => {
    const dayEvents = getEventsForDay(dateRange.days[0]);
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

    const getEventHour = (event: CalendarEvent) => {
      if (!event.start_time) return null;
      return parseInt(event.start_time.split(":")[0]);
    };

    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="text-center py-4 border-b border-border bg-muted/30">
          <p className={cn("text-2xl font-display font-bold", isToday(dateRange.days[0]) && "text-primary")}>
            {format(dateRange.days[0], "EEEE")}
          </p>
          <p className="text-sm text-muted-foreground">{format(dateRange.days[0], "MMMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground mt-1">{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="divide-y divide-border">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter((e) => getEventHour(e) === hour);
            const noTimeEvents = hour === 7 ? dayEvents.filter((e) => !e.start_time) : [];
            const allForSlot = [...hourEvents, ...noTimeEvents];
            const h12 = hour > 12 ? hour - 12 : hour;
            const ampm = hour >= 12 ? "PM" : "AM";

            return (
              <div key={hour} className="flex min-h-[60px]">
                <div className="w-20 shrink-0 text-right pr-3 py-2 text-xs text-muted-foreground border-r border-border">
                  {h12}:00 {ampm}
                </div>
                <div className="flex-1 p-1.5 space-y-1">
                  {allForSlot.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarDays size={24} className="text-primary" />
            Event Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {events.length} event{events.length !== 1 ? "s" : ""} in view
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigate_prev}><ChevronLeft size={16} /></Button>
          <Button variant="outline" size="icon" onClick={navigate_next}><ChevronRight size={16} /></Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">Today</Button>
        </div>
        <h2 className="font-display font-bold text-lg">{headerLabel}</h2>
      </div>

      {/* Calendar body */}
      {loading ? (
        <Skeleton className="h-[500px] w-full rounded-xl" />
      ) : (
        <>
          {view === "month" && <MonthView />}
          {view === "week" && <WeekView />}
          {view === "day" && <DayView />}
        </>
      )}
    </div>
  );
};

export default EventCalendarPage;