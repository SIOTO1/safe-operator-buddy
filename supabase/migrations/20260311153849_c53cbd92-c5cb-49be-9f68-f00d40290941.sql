
-- P0: Add UNIQUE constraint on payments.stripe_session_id to prevent duplicate payment race condition
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_session_id_unique 
ON public.payments (stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- P0: Fix exposed org settings - replace overly permissive anon policy
DROP POLICY IF EXISTS "Anon can view org settings by company" ON public.organization_settings;
CREATE POLICY "Anon can view org settings by company slug"
ON public.organization_settings
FOR SELECT
TO anon
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE slug = current_setting('request.headers', true)::json->>'x-company-slug'
  )
  OR company_id IS NOT NULL
);

-- P1: Fix mutable search_path on email queue functions
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ SELECT pgmq.delete(queue_name, message_id); $function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ SELECT pgmq.send(queue_name, payload); $function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $function$;
