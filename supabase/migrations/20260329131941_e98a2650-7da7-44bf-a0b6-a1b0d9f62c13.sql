-- Add company_id column to payments for direct scoping
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Backfill company_id from linked events
UPDATE public.payments p
SET company_id = e.company_id
FROM public.events e
WHERE p.event_id = e.id AND p.company_id IS NULL;

-- Backfill company_id from linked quotes
UPDATE public.payments p
SET company_id = q.company_id
FROM public.quotes q
WHERE p.quote_id = q.id AND p.company_id IS NULL;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view company payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments" ON public.payments;

-- New policies scoped directly to company_id
CREATE POLICY "Users can view company payments"
  ON public.payments FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());