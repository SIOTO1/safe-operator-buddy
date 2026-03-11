
-- Fix the org_settings anon policy - scope to specific company lookup only
-- The previous policy was still too broad
DROP POLICY IF EXISTS "Anon can view org settings by company slug" ON public.organization_settings;

-- Create a security definer function for anon storefront access
CREATE OR REPLACE FUNCTION public.get_org_settings_by_slug(_slug text)
RETURNS TABLE(
  company_name text,
  logo_url text,
  website text,
  phone text,
  email text,
  address text,
  default_delivery_fee numeric,
  review_link text,
  company_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    os.company_name, os.logo_url, os.website, os.phone, os.email, 
    os.address, os.default_delivery_fee, os.review_link, os.company_id
  FROM public.organization_settings os
  INNER JOIN public.companies c ON c.id = os.company_id
  WHERE c.slug = _slug
  LIMIT 1;
$$;
