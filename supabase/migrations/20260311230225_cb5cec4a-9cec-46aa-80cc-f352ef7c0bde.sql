
-- Fix cross-tenant exposure on products: replace anonymous public SELECT with company-scoped policy
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anon can view active products by company slug"
  ON public.products
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND company_id = (
      SELECT c.id FROM public.companies c
      WHERE c.slug = current_setting('request.query.slug', true)
      LIMIT 1
    )
  );

-- Fix cross-tenant exposure on equipment_catalog: replace public SELECT with company-scoped policy
DROP POLICY IF EXISTS "Anyone can view active equipment" ON public.equipment_catalog;

CREATE POLICY "Anon can view active equipment by company slug"
  ON public.equipment_catalog
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND company_id = (
      SELECT c.id FROM public.companies c
      WHERE c.slug = current_setting('request.query.slug', true)
      LIMIT 1
    )
  );
