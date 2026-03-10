
-- Create quote_status enum
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'expired');

-- Create quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  status quote_status NOT NULL DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped to company
CREATE POLICY "Users can view company quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert company quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update company quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete company quotes" ON public.quotes
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());

-- Auto-update updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Quote line items table
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quote items" ON public.quote_items
  FOR SELECT TO authenticated
  USING (quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can insert quote items" ON public.quote_items
  FOR INSERT TO authenticated
  WITH CHECK (quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can update quote items" ON public.quote_items
  FOR UPDATE TO authenticated
  USING (quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id()));

CREATE POLICY "Users can delete quote items" ON public.quote_items
  FOR DELETE TO authenticated
  USING (quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id()));
