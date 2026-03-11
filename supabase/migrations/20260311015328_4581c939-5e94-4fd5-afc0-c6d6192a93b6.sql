
-- Create employee_role enum
CREATE TYPE public.employee_role AS ENUM ('driver', 'installer', 'crew_lead', 'warehouse', 'manager');

-- Create employee_status enum
CREATE TYPE public.employee_status AS ENUM ('active', 'inactive', 'on_leave');

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role employee_role NOT NULL DEFAULT 'installer',
  status employee_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped by company_id
CREATE POLICY "Users can view company employees"
  ON public.employees FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Managers can insert company employees"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company employees"
  ON public.employees FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company employees"
  ON public.employees FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- Updated_at trigger
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
