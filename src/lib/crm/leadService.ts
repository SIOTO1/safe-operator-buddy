import { supabase } from "@/integrations/supabase/client";
import type { Lead, PipelineStage } from "@/types/crm";

export async function getLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("crm_leads" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown) as Lead[];
}

export async function getLeadById(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from("crm_leads" as any)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data as unknown) as Lead;
}

export async function createLead(lead: Omit<Lead, "id" | "created_at">): Promise<Lead> {
  const { data, error } = await supabase
    .from("crm_leads" as any)
    .insert(lead as any)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as Lead;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from("crm_leads" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as Lead;
}

export async function updateLeadStage(id: string, status: string): Promise<Lead> {
  return updateLead(id, { status });
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("crm_leads" as any).delete().eq("id", id);
  if (error) throw error;
}
