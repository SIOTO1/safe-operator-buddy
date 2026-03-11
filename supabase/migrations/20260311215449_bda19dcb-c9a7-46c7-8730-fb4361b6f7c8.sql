
-- Fix 1: Restrict invite tokens SELECT to admins only
DROP POLICY IF EXISTS "Users can view company invites" ON public.user_invites;
CREATE POLICY "Admins can view company invites"
ON public.user_invites FOR SELECT
TO authenticated
USING (company_id = get_user_company_id() AND is_company_admin(auth.uid()));

-- Fix 2: Tighten anonymous companies SELECT to only allow slug-based lookup
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;
CREATE POLICY "Anon can view company by slug"
ON public.companies FOR SELECT
TO anon
USING (slug = current_setting('request.query.slug', true));

-- Fix 3: Enable leaked password protection requires auth config, not SQL
-- (will handle separately)
