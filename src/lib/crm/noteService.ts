import { supabase } from "@/integrations/supabase/client";
import type { LeadNote } from "@/types/crm";

export async function getNotesByLeadId(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from("crm_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as LeadNote[];
}

export async function createNote(note: Omit<LeadNote, "id" | "created_at">): Promise<LeadNote> {
  const { data, error } = await supabase
    .from("crm_notes")
    .insert(note)
    .select()
    .single();
  if (error) throw error;
  return data as LeadNote;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("crm_notes").delete().eq("id", id);
  if (error) throw error;
}
