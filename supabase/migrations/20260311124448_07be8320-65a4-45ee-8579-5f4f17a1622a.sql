
-- Allow anon users to read org settings by company_id (for public storefront)
CREATE POLICY "Anon can view org settings by company" ON public.organization_settings
  FOR SELECT TO anon
  USING (true);

-- Also allow anon to view products (the existing policy uses role 'public' which includes anon, but let's be explicit)
-- The existing "Anyone can view active products" policy on products already covers this.
