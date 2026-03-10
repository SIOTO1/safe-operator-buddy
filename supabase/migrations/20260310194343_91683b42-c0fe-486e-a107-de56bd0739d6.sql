
-- Create product category enum
CREATE TYPE public.product_category AS ENUM (
  'inflatables', 'slides', 'foam_machines', 'tents', 'tables', 'chairs', 'generators', 'concessions', 'other'
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL DEFAULT 'other',
  price NUMERIC DEFAULT 0,
  quantity_available INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped by company
CREATE POLICY "Users can view company products"
  ON public.products FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can insert company products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company products"
  ON public.products FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company products"
  ON public.products FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- Public can view active products (for booking page)
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT TO anon
  USING (is_active = true);

-- Updated_at trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
