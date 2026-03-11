
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_amount NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company policies"
  ON public.insurance_policies FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can insert company policies"
  ON public.insurance_policies FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company policies"
  ON public.insurance_policies FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company policies"
  ON public.insurance_policies FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
