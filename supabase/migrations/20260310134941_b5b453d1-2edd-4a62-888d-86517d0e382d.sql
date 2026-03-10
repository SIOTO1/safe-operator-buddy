
-- 1. Create companies table (no policies yet)
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Add company_id columns FIRST
ALTER TABLE public.profiles
  ADD COLUMN company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.crm_leads
  ADD COLUMN company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.crm_deals
  ADD COLUMN company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.crm_tasks
  ADD COLUMN company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.crm_notes
  ADD COLUMN company_id uuid REFERENCES public.companies(id);

ALTER TABLE public.crm_activity_log
  ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- 3. Helper function
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- 4. Companies RLS (now profiles.company_id exists)
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT TO authenticated
  USING (id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update own company"
  ON public.companies FOR UPDATE TO authenticated
  USING (
    id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND public.has_role(auth.uid(), 'owner')
  );

-- 5. CRM RLS with company scoping
DROP POLICY IF EXISTS "Authenticated users can manage leads" ON public.crm_leads;
CREATE POLICY "Users can view company leads" ON public.crm_leads FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can insert company leads" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Users can update company leads" ON public.crm_leads FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can delete company leads" ON public.crm_leads FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Authenticated users can manage deals" ON public.crm_deals;
CREATE POLICY "Users can view company deals" ON public.crm_deals FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can insert company deals" ON public.crm_deals FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Users can update company deals" ON public.crm_deals FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can delete company deals" ON public.crm_deals FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.crm_tasks;
CREATE POLICY "Users can view company tasks" ON public.crm_tasks FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can insert company tasks" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Users can update company tasks" ON public.crm_tasks FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can delete company tasks" ON public.crm_tasks FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Authenticated users can manage notes" ON public.crm_notes;
CREATE POLICY "Users can view company notes" ON public.crm_notes FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can insert company notes" ON public.crm_notes FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "Users can update company notes" ON public.crm_notes FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can delete company notes" ON public.crm_notes FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.crm_activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.crm_activity_log;
CREATE POLICY "Users can view company activity" ON public.crm_activity_log FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "Users can insert company activity" ON public.crm_activity_log FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());

-- 6. Updated handle_new_user: auto-creates company for first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _company_id uuid;
  _is_first boolean;
BEGIN
  _is_first := (SELECT COUNT(*) = 0 FROM public.user_roles);
  IF _is_first THEN
    INSERT INTO public.companies (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1) || '''s Company'))
    RETURNING id INTO _company_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'crew');
  END IF;
  INSERT INTO public.profiles (user_id, email, display_name, company_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), _company_id);
  RETURN NEW;
END;
$$;

-- 7. Updated triggers to propagate company_id
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
  VALUES (NEW.id, 'lead_created', 'Lead "' || NEW.name || '" was created', NEW.assigned_to, NEW.company_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_note_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
  VALUES (NEW.lead_id, 'note_added', 'Note added', NEW.created_by, NEW.company_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
    VALUES (NEW.lead_id, 'task_created', 'Task "' || NEW.title || '" created', NEW.created_by, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done' THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
    VALUES (NEW.lead_id, 'task_completed', 'Task "' || NEW.title || '" completed', NEW.assigned_to, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_deal_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
    VALUES (NEW.lead_id, 'deal_created', 'Deal "' || NEW.title || '" created ($' || COALESCE(NEW.value, 0) || ')', NEW.created_by, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_deal_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND (OLD.stage IS DISTINCT FROM NEW.stage OR OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
    VALUES (NEW.lead_id, 'deal_updated', 'Deal "' || NEW.title || '" updated (stage: ' || NEW.stage || ', $' || COALESCE(NEW.value, 0) || ')', NEW.created_by, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.crm_activity_log (lead_id, event_type, description, performed_by, company_id)
    VALUES (NEW.id, 'status_change', 'Status changed from ' || COALESCE(OLD.stage, 'none') || ' to ' || NEW.stage, auth.uid(), NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_followup_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.crm_tasks (lead_id, title, assigned_to, due_date, status, priority, created_by, company_id)
  VALUES (
    NEW.id, 'Follow up with ' || NEW.name,
    COALESCE(NEW.assigned_to, auth.uid()),
    (now() + interval '24 hours')::date,
    'todo', 'medium',
    COALESCE(NEW.assigned_to, auth.uid()),
    NEW.company_id
  );
  RETURN NEW;
END;
$$;
