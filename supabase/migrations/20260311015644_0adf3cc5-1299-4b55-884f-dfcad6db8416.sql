
-- Create certification status enum
CREATE TYPE public.certification_status AS ENUM ('active', 'expired', 'pending', 'revoked');

-- Create employee_certifications table
CREATE TABLE public.employee_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  certification_name TEXT NOT NULL,
  certification_status certification_status NOT NULL DEFAULT 'pending',
  issued_date DATE,
  expiration_date DATE,
  certificate_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;

-- RLS: view if employee belongs to user's company
CREATE POLICY "Users can view company employee certifications"
  ON public.employee_certifications FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE company_id = get_user_company_id()));

CREATE POLICY "Managers can insert employee certifications"
  ON public.employee_certifications FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update employee certifications"
  ON public.employee_certifications FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete employee certifications"
  ON public.employee_certifications FOR DELETE TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
