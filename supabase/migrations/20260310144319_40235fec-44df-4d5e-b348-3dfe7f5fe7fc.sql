
-- Create workspaces table for multi-location support
CREATE TABLE public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Users can view workspaces belonging to their company
CREATE POLICY "Users can view company workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

-- Owners can insert workspaces for their company
CREATE POLICY "Owners can insert company workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

-- Owners can update company workspaces
CREATE POLICY "Owners can update company workspaces"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

-- Owners can delete company workspaces
CREATE POLICY "Owners can delete company workspaces"
  ON public.workspaces FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));
