
-- Fix is_company_admin to scope to user's own company
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
      AND company_id = (SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1)
  )
$$;
