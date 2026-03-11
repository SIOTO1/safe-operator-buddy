import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/types/crm";

export async function getLeads(workspaceId?: string | null): Promise<Lead[]> {
  let query = supabase
    .from("crm_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Lead[];
}

export async function getLeadById(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function createLead(lead: Omit<Lead, "id" | "created_at">): Promise<Lead> {
  const { data, error } = await supabase
    .from("crm_leads")
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from("crm_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLeadStage(id: string, stage: string): Promise<Lead> {
  return updateLead(id, { stage });
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("crm_leads").delete().eq("id", id);
  if (error) throw error;
}
