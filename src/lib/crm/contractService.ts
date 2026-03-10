import { supabase } from "@/integrations/supabase/client";

export type Contract = {
  id: string;
  quote_id: string | null;
  event_id: string | null;
  contract_text: string;
  signed_by: string | null;
  signed_at: string | null;
  signature_image: string | null;
  created_at: string;
};

export async function getContractByQuoteId(quoteId: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from("contracts" as any)
    .select("*")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Contract | null;
}

export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from("contracts" as any)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Contract;
}

export async function createContract(contract: Omit<Contract, "id" | "created_at">): Promise<Contract> {
  const { data, error } = await supabase
    .from("contracts" as any)
    .insert(contract as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Contract;
}

export async function signContract(
  id: string,
  signedBy: string,
  signatureImage: string
): Promise<Contract> {
  const { data, error } = await supabase
    .from("contracts" as any)
    .update({
      signed_by: signedBy,
      signed_at: new Date().toISOString(),
      signature_image: signatureImage,
    } as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Contract;
}
