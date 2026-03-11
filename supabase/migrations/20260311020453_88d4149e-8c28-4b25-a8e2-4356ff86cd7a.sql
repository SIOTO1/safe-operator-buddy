
-- Function to calculate product availability for a given date and company
-- Returns product_id and units_allocated (how many are assigned to events on that date)
CREATE OR REPLACE FUNCTION public.get_product_availability(_company_id uuid, _date date)
RETURNS TABLE(product_id uuid, units_allocated bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ep.product_id, SUM(ep.quantity)::bigint AS units_allocated
  FROM event_products ep
  INNER JOIN events e ON e.id = ep.event_id
  WHERE e.event_date = _date
    AND ep.product_id IN (
      SELECT id FROM products WHERE company_id = _company_id AND is_active = true
    )
  GROUP BY ep.product_id
$$;
