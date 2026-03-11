
-- Allow anonymous users to view companies by slug (for public storefront)
CREATE POLICY "Anyone can view companies"
  ON public.companies FOR SELECT TO anon
  USING (true);
