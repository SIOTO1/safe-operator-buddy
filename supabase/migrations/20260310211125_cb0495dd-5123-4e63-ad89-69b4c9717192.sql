-- Create contracts table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  contract_text text NOT NULL DEFAULT '',
  signed_by text,
  signed_at timestamp with time zone,
  signature_image text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS: scoped via quote's company_id
CREATE POLICY "Users can view company contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
    OR event_id IN (SELECT id FROM public.events)
  );

CREATE POLICY "Users can insert company contracts"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (
    quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Users can update company contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "Users can delete company contracts"
  ON public.contracts FOR DELETE TO authenticated
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE company_id = get_user_company_id())
  );

-- Storage bucket for signature images
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

CREATE POLICY "Authenticated users can upload signatures"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can view signatures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signatures');