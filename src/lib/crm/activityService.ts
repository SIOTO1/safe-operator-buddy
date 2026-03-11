import { supabase } from "@/integrations/supabase/client";

export interface ActivityEvent {
  id: string;
  type: "note" | "task" | "deal" | "status_change";
  description: string;
  timestamp: string;
  userId?: string;
}

export async function getActivityForLead(leadId: string): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from("crm_activity_log")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    type: row.event_type as ActivityEvent["type"],
    description: row.description,
    timestamp: row.created_at,
    userId: row.performed_by ?? undefined,
  }));
}
