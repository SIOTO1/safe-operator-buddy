import { supabase } from "@/integrations/supabase/client";

export type QuoteStatus = "draft" | "sent" | "accepted" | "expired";

export type Quote = {
  id: string;
  company_id: string | null;
  workspace_id: string | null;
  lead_id: string | null;
  title: string;
  status: QuoteStatus;
  total_amount: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  lead?: { name: string; email: string } | null;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  product_id: string | null;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

export async function getQuotes(companyId?: string | null): Promise<Quote[]> {
  const query = supabase
    .from("quotes")
    .select("*, lead:crm_leads(name, email)")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Quote[];
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, lead:crm_leads(name, email)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Quote;
}

export async function createQuote(quote: Omit<Quote, "id" | "created_at" | "updated_at" | "lead">): Promise<Quote> {
  const { data, error } = await supabase
    .from("quotes")
    .insert(quote)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Quote;
}

export async function updateQuote(id: string, updates: Partial<Quote>): Promise<Quote> {
  const { lead, ...rest } = updates;
  const { data, error } = await supabase
    .from("quotes")
    .update(rest)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Quote;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}

// Quote Items
export async function getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
  const { data, error } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("created_at");
  if (error) throw error;
  return (data || []) as QuoteItem[];
}

export async function addQuoteItem(item: Omit<QuoteItem, "id" | "created_at">): Promise<QuoteItem> {
  const { data, error } = await supabase
    .from("quote_items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data as QuoteItem;
}

export async function deleteQuoteItem(id: string): Promise<void> {
  const { error } = await supabase.from("quote_items").delete().eq("id", id);
  if (error) throw error;
}
