import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/crm";

export async function getTasks(workspaceId?: string | null, page = 0, pageSize = 100): Promise<Task[]> {
  let query = supabase
    .from("crm_tasks")
    .select("*")
    .order("due_date", { ascending: true })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Task[];
}

export async function getTasksByLeadId(leadId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .select("*")
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data || []) as Task[];
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .insert(task as any)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("crm_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
  if (error) throw error;
}
