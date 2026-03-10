
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC,
  stage TEXT NOT NULL DEFAULT 'new',
  expected_close_date DATE,
  assigned_to UUID,
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage deals"
ON public.crm_deals FOR ALL TO authenticated
USING (true) WITH CHECK (true);
