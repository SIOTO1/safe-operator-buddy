import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useEventConflicts } from "@/hooks/use-event-conflicts";

export interface ScheduleEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  company_id: string | null;
  workspace_id: string | null;
  lead_id: string | null;
}

const EVENT_SELECT = "id, title, event_date, start_time, end_time, location, notes, company_id, workspace_id";

async function fetchEvents(startDate: string, endDate: string): Promise<ScheduleEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date");
  if (error) throw error;
  return (data || []) as unknown as ScheduleEvent[];
}

export function useWeekEvents(weekStart: Date) {
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["scheduling-events", "week", startDate],
    queryFn: () => fetchEvents(startDate, endDate),
  });
}

export function useMonthEvents(monthDays: Date[]) {
  const mStart = format(monthDays[0], "yyyy-MM-dd");
  const mEnd = format(monthDays[monthDays.length - 1], "yyyy-MM-dd");

  return useQuery({
    queryKey: ["scheduling-events", "month", mStart],
    queryFn: () => fetchEvents(mStart, mEnd),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user, companyId } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      event_date: string;
      start_time: string | null;
      end_time: string | null;
      location: string | null;
      notes: string | null;
    }) => {
      const { error } = await supabase.from("events").insert({
        ...params,
        created_by: user!.id,
        company_id: companyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event created!");
      queryClient.invalidateQueries({ queryKey: ["scheduling-events"] });
    },
    onError: () => toast.error("Failed to create event"),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["scheduling-events"] });
    },
    onError: () => toast.error("Failed to delete event"),
  });
}

export function useRescheduleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, newDate }: { eventId: string; newDate: string }) => {
      const { error } = await supabase.from("events").update({ event_date: newDate }).eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event rescheduled!");
      queryClient.invalidateQueries({ queryKey: ["scheduling-events"] });
    },
    onError: () => toast.error("Failed to reschedule event"),
  });
}
