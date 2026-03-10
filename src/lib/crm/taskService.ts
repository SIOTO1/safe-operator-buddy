import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/crm";

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("crm_tasks" as any)
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data as unknown) as Task[];
}

export async function getTasksByLeadId(leadId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("crm_tasks" as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data as unknown) as Task[];
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const { data, error } = await supabase
    .from("crm_tasks" as any)
    .insert(task as any)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as Task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("crm_tasks" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("crm_tasks" as any).delete().eq("id", id);
  if (error) throw error;
}
