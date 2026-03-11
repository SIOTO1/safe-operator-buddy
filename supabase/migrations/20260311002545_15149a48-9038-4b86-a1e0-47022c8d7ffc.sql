
CREATE TABLE public.portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

ALTER TABLE public.portal_tokens ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert/manage tokens (via edge functions)
CREATE POLICY "Service role can manage portal tokens"
  ON public.portal_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated owners/managers can view tokens for their events
CREATE POLICY "Owners and managers can view portal tokens"
  ON public.portal_tokens FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
