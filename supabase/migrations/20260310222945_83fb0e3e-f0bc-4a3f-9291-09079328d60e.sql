
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'full',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text DEFAULT 'stripe',
  transaction_id text,
  stripe_session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events)
    OR quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Users can insert payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Users can update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
  );
