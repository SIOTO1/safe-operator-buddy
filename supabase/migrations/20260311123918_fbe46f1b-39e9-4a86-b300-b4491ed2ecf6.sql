
-- ============================================================
-- 1. Add company_id and workspace_id to events table
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Backfill events.company_id from the creator's profile
UPDATE public.events e
SET company_id = p.company_id
FROM public.profiles p
WHERE p.user_id = e.created_by
  AND e.company_id IS NULL;

-- Drop old permissive RLS policies on events
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Owners can delete events" ON public.events;
DROP POLICY IF EXISTS "Owners can insert events" ON public.events;
DROP POLICY IF EXISTS "Owners can update events" ON public.events;

-- New tenant-scoped RLS policies for events
CREATE POLICY "Users can view company events" ON public.events
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Owners can insert company events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update company events" ON public.events
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete company events" ON public.events
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

-- ============================================================
-- 2. Add company_id to booking_requests table
-- ============================================================
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill booking_requests.company_id from linked event
UPDATE public.booking_requests br
SET company_id = e.company_id
FROM public.events e
WHERE e.id = br.event_id
  AND br.company_id IS NULL;

-- ============================================================
-- 3. Add company_id to equipment_catalog table
-- ============================================================
ALTER TABLE public.equipment_catalog
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill equipment_catalog.company_id from creator's profile
UPDATE public.equipment_catalog ec
SET company_id = p.company_id
FROM public.profiles p
WHERE p.user_id = ec.created_by
  AND ec.company_id IS NULL;

-- Update equipment_catalog RLS to include tenant scoping
DROP POLICY IF EXISTS "Owners and managers can manage equipment" ON public.equipment_catalog;

CREATE POLICY "Owners and managers can manage equipment" ON public.equipment_catalog
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 4. Fix payments.event_id cascade: change from CASCADE to SET NULL
-- ============================================================
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_event_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- ============================================================
-- 5. Standardize CRM cascade: crm_tasks.lead_id and crm_deals.lead_id to CASCADE
-- ============================================================
ALTER TABLE public.crm_tasks
  DROP CONSTRAINT IF EXISTS crm_tasks_lead_id_fkey;

ALTER TABLE public.crm_tasks
  ADD CONSTRAINT crm_tasks_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE CASCADE;

ALTER TABLE public.crm_deals
  DROP CONSTRAINT IF EXISTS crm_deals_lead_id_fkey;

ALTER TABLE public.crm_deals
  ADD CONSTRAINT crm_deals_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.crm_leads(id) ON DELETE CASCADE;

-- ============================================================
-- 6. Fix profiles.company_id to SET NULL on company deletion
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
