
-- Update auto_create_followup_task to include workspace_id from the lead
CREATE OR REPLACE FUNCTION public.auto_create_followup_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.crm_tasks (lead_id, title, assigned_to, due_date, status, priority, created_by, company_id, workspace_id)
  VALUES (
    NEW.id, 'Follow up with ' || NEW.name,
    COALESCE(NEW.assigned_to, auth.uid()),
    (now() + interval '24 hours')::date,
    'todo', 'medium',
    COALESCE(NEW.assigned_to, auth.uid()),
    NEW.company_id,
    NEW.workspace_id
  );
  RETURN NEW;
END;
$$;

-- Update activity log triggers to include workspace_id
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
  VALUES (NEW.id, 'lead_created', 'Lead "' || NEW.name || '" was created', NEW.assigned_to, NEW.company_id, NEW.workspace_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
    VALUES (NEW.id, 'status_change', 'Status changed from ' || COALESCE(OLD.stage, 'none') || ' to ' || NEW.stage, auth.uid(), NEW.company_id, NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_note_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
  VALUES (NEW.lead_id, 'note_added', 'Note added', NEW.created_by, NEW.company_id, NEW.workspace_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
    VALUES (NEW.lead_id, 'task_created', 'Task "' || NEW.title || '" created', NEW.created_by, NEW.company_id, NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done' THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
    VALUES (NEW.lead_id, 'task_completed', 'Task "' || NEW.title || '" completed', NEW.assigned_to, NEW.company_id, NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_deal_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
    VALUES (NEW.lead_id, 'deal_created', 'Deal "' || NEW.title || '" created ($' || COALESCE(NEW.value, 0) || ')', NEW.created_by, NEW.company_id, NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_deal_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND (OLD.stage IS DISTINCT FROM NEW.stage OR OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id, workspace_id)
    VALUES (NEW.lead_id, 'deal_updated', 'Deal "' || NEW.title || '" updated (stage: ' || NEW.stage || ', $' || COALESCE(NEW.value, 0) || ')', NEW.created_by, NEW.company_id, NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;
