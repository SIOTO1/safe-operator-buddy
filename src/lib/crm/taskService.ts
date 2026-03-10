import { supabase } from "@/integrations/supabase/client";
import type { CrmTask } from "@/types/crm";

export async function getTasks(): Promise<CrmTask[]> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data as CrmTask[];
}

export async function getTasksByLeadId(leadId: string): Promise<CrmTask[]> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .select("*")
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data as CrmTask[];
}

export async function createTask(task: Omit<CrmTask, "id" | "created_at" | "updated_at">): Promise<CrmTask> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  return data as CrmTask;
}

export async function updateTask(id: string, updates: Partial<CrmTask>): Promise<CrmTask> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CrmTask;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
  if (error) throw error;
}
