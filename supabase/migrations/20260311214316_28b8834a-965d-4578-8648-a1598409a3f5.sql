
-- Create enum for team roles
CREATE TYPE public.team_role AS ENUM ('admin', 'manager', 'staff');

-- Create enum for user status
CREATE TYPE public.team_user_status AS ENUM ('active', 'inactive', 'invited');

-- Create company_users table
CREATE TABLE public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'staff'::team_role,
  status team_user_status NOT NULL DEFAULT 'active'::team_user_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin in their company
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id
      AND role = 'admin'
      AND status = 'active'
  )
$$;

-- RLS: Users can view members of their own company
CREATE POLICY "Users can view company members"
ON public.company_users
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id()
);

-- RLS: Only admins can insert new company users
CREATE POLICY "Admins can insert company users"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id()
  AND is_company_admin(auth.uid())
);

-- RLS: Only admins can update company users
CREATE POLICY "Admins can update company users"
ON public.company_users
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND is_company_admin(auth.uid())
);

-- RLS: Only admins can delete company users
CREATE POLICY "Admins can delete company users"
ON public.company_users
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id()
  AND is_company_admin(auth.uid())
);

-- Seed existing owners as admins, managers as managers, crew as staff
INSERT INTO public.company_users (company_id, user_id, role, status)
SELECT p.company_id, p.user_id,
  CASE ur.role
    WHEN 'owner' THEN 'admin'::team_role
    WHEN 'manager' THEN 'manager'::team_role
    ELSE 'staff'::team_role
  END,
  'active'::team_user_status
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE p.company_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;
