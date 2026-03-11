
-- RLS policies for quote_items, scoped through quotes.company_id
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company quote items"
ON public.quote_items
FOR SELECT
TO authenticated
USING (
  quote_id IN (
    SELECT id FROM public.quotes WHERE company_id = get_user_company_id()
  )
);

CREATE POLICY "Users can insert company quote items"
ON public.quote_items
FOR INSERT
TO authenticated
WITH CHECK (
  quote_id IN (
    SELECT id FROM public.quotes WHERE company_id = get_user_company_id()
  )
);

CREATE POLICY "Users can update company quote items"
ON public.quote_items
FOR UPDATE
TO authenticated
USING (
  quote_id IN (
    SELECT id FROM public.quotes WHERE company_id = get_user_company_id()
  )
);

CREATE POLICY "Users can delete company quote items"
ON public.quote_items
FOR DELETE
TO authenticated
USING (
  quote_id IN (
    SELECT id FROM public.quotes WHERE company_id = get_user_company_id()
  )
);
