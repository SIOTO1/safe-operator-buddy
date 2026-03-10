
-- Add workspace_id to all CRM tables
ALTER TABLE public.crm_leads ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.crm_notes ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.crm_tasks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.crm_deals ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.crm_activity_log ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Add selected_workspace_id to profiles for user's current workspace context
ALTER TABLE public.profiles ADD COLUMN selected_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Helper function to get user's selected workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT selected_workspace_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;
