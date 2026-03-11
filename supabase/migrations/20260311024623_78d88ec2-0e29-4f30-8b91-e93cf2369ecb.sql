
CREATE TYPE public.inspection_status AS ENUM ('pass', 'fail', 'needs_repair');

CREATE TABLE public.equipment_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspected_by UUID NOT NULL,
  inspection_status inspection_status NOT NULL DEFAULT 'pass',
  notes TEXT,
  next_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inspections"
  ON public.equipment_inspections FOR SELECT TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE company_id = get_user_company_id()));

CREATE POLICY "Authenticated users can insert inspections"
  ON public.equipment_inspections FOR INSERT TO authenticated
  WITH CHECK (product_id IN (SELECT id FROM public.products WHERE company_id = get_user_company_id()));

CREATE POLICY "Managers can update inspections"
  ON public.equipment_inspections FOR UPDATE TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete inspections"
  ON public.equipment_inspections FOR DELETE TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
