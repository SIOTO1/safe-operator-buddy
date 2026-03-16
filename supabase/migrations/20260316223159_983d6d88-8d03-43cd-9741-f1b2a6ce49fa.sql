
-- Create payment_activity_logs table
CREATE TABLE public.payment_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_activity_logs ENABLE ROW LEVEL SECURITY;

-- Immutable: SELECT only for authenticated users, INSERT for service role and authenticated
-- No UPDATE or DELETE policies = immutable

-- Admins and managers can view all company logs
CREATE POLICY "Admins and managers can view payment logs"
ON public.payment_activity_logs
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id()
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Staff can view logs for events they are assigned to
CREATE POLICY "Staff can view assigned event payment logs"
ON public.payment_activity_logs
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id()
  AND event_id IN (
    SELECT ea.event_id FROM public.event_assignments ea WHERE ea.user_id = auth.uid()
  )
);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert payment logs"
ON public.payment_activity_logs
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can insert their own logs
CREATE POLICY "Authenticated users can insert own payment logs"
ON public.payment_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id());

-- Create index for fast lookups
CREATE INDEX idx_payment_activity_logs_event_id ON public.payment_activity_logs(event_id);
CREATE INDEX idx_payment_activity_logs_company_id ON public.payment_activity_logs(company_id);
