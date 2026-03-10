
-- Trigger: log when a new lead is created
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
  VALUES (NEW.id, 'lead_created', 'Lead "' || NEW.name || '" was created', NEW.assigned_to);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lead_created
  AFTER INSERT ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_created();

-- Trigger: log when a note is added
CREATE OR REPLACE FUNCTION public.log_note_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
  VALUES (NEW.lead_id, 'note_added', 'Note added', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_note_added
  AFTER INSERT ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.log_note_added();

-- Trigger: log when a task is created
CREATE OR REPLACE FUNCTION public.log_task_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
    VALUES (NEW.lead_id, 'task_created', 'Task "' || NEW.title || '" created', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_task_created
  AFTER INSERT ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_created();

-- Trigger: log when a task is completed
CREATE OR REPLACE FUNCTION public.log_task_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done' THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
    VALUES (NEW.lead_id, 'task_completed', 'Task "' || NEW.title || '" completed', NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_task_completed
  AFTER UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_completed();

-- Trigger: log when a deal is created
CREATE OR REPLACE FUNCTION public.log_deal_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
    VALUES (NEW.lead_id, 'deal_created', 'Deal "' || NEW.title || '" created ($' || COALESCE(NEW.value, 0) || ')', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_deal_created
  AFTER INSERT ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.log_deal_created();

-- Trigger: log when a deal is updated
CREATE OR REPLACE FUNCTION public.log_deal_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND (OLD.stage IS DISTINCT FROM NEW.stage OR OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by)
    VALUES (NEW.lead_id, 'deal_updated', 'Deal "' || NEW.title || '" updated (stage: ' || NEW.stage || ', $' || COALESCE(NEW.value, 0) || ')', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_deal_updated
  AFTER UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.log_deal_updated();

-- Also create the lead status change trigger if it doesn't exist as a trigger
CREATE OR REPLACE TRIGGER trg_log_lead_status_change
  AFTER UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();
