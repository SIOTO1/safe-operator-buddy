
-- CRITICAL: Fix cross-company privilege escalation on user_roles
-- Owners should only manage roles for users in their own company
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;

CREATE POLICY "Owners can view company roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role) 
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p 
    WHERE p.company_id = get_user_company_id()
  )
);

CREATE POLICY "Owners can insert company roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p 
    WHERE p.company_id = get_user_company_id()
  )
);

CREATE POLICY "Owners can update company roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p 
    WHERE p.company_id = get_user_company_id()
  )
);

CREATE POLICY "Owners can delete company roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p 
    WHERE p.company_id = get_user_company_id()
  )
);

-- CRITICAL: Fix cross-company profile read - scope to own company
DROP POLICY IF EXISTS "Owners can view all profiles" ON public.profiles;

CREATE POLICY "Owners can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role) 
  AND company_id = get_user_company_id()
);
