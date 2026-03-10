import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/types/crm";

export async function getDeals(workspaceId?: string | null): Promise<Deal[]> {
  let query = supabase
    .from("crm_deals" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as Deal[];
}

export async function getDealById(id: string): Promise<Deal> {
  const { data, error } = await supabase
    .from("crm_deals" as any)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data as unknown) as Deal;
}

export async function getDealsByLeadId(leadId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("crm_deals" as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown) as Deal[];
}

export async function createDeal(deal: Omit<Deal, "id" | "created_at">): Promise<Deal> {
  const { data, error } = await supabase
    .from("crm_deals" as any)
    .insert(deal as any)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as Deal;
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  const { data, error } = await supabase
    .from("crm_deals" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as Deal;
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from("crm_deals" as any).delete().eq("id", id);
  if (error) throw error;
}
