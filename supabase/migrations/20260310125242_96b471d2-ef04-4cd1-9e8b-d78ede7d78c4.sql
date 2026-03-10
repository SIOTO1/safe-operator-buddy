
CREATE TABLE public.crm_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity logs"
  ON public.crm_activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON public.crm_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger: log status changes on crm_leads
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
    VALUES (
      NEW.id,
      'status_change',
      'Status changed from ' || COALESCE(OLD.stage, 'none') || ' to ' || NEW.stage,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lead_status_change
  AFTER UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_status_change();
