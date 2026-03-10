
CREATE OR REPLACE FUNCTION public.auto_create_followup_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.crm_tasks (
    lead_id,
    title,
    assigned_to,
    due_date,
    status,
    priority,
    created_by
  ) VALUES (
    NEW.id,
    'Follow up with ' || NEW.name,
    COALESCE(NEW.assigned_to, auth.uid()),
    (now() + interval '24 hours')::date,
    'todo',
    'medium',
    COALESCE(NEW.assigned_to, auth.uid())
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_followup_task
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_followup_task();
