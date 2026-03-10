import { supabase } from "@/integrations/supabase/client";
import type { LeadNote } from "@/types/crm";

export async function getNotesByLeadId(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from("crm_notes" as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown) as LeadNote[];
}

export async function createNote(note: Omit<LeadNote, "id" | "created_at">): Promise<LeadNote> {
  const { data, error } = await supabase
    .from("crm_notes" as any)
    .insert(note as any)
    .select()
    .single();
  if (error) throw error;
  return (data as unknown) as LeadNote;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("crm_notes" as any).delete().eq("id", id);
  if (error) throw error;
}
