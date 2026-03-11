
-- ============================================================
-- 1. Fix event_assignments: scope SELECT through events table
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.event_assignments;

CREATE POLICY "Users can view company event assignments" ON public.event_assignments
  FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events));

-- Scope INSERT/UPDATE/DELETE through events too
DROP POLICY IF EXISTS "Owners can insert assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Owners can update assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Owners can delete assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Users can update own assignment status" ON public.event_assignments;

CREATE POLICY "Owners can insert company assignments" ON public.event_assignments
  FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events) AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update company assignments" ON public.event_assignments
  FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Users can update own assignment status" ON public.event_assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND event_id IN (SELECT id FROM public.events));

CREATE POLICY "Owners can delete company assignments" ON public.event_assignments
  FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND has_role(auth.uid(), 'owner'));

-- ============================================================
-- 2. Fix event_equipment: scope through events table
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view event equipment" ON public.event_equipment;
DROP POLICY IF EXISTS "Owners can insert event equipment" ON public.event_equipment;
DROP POLICY IF EXISTS "Owners can update event equipment" ON public.event_equipment;
DROP POLICY IF EXISTS "Owners can delete event equipment" ON public.event_equipment;

CREATE POLICY "Users can view company event equipment" ON public.event_equipment
  FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events));

CREATE POLICY "Managers can insert company event equipment" ON public.event_equipment
  FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company event equipment" ON public.event_equipment
  FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company event equipment" ON public.event_equipment
  FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 3. Fix event_products: scope through events table
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view event products" ON public.event_products;
DROP POLICY IF EXISTS "Managers can insert event products" ON public.event_products;
DROP POLICY IF EXISTS "Managers can update event products" ON public.event_products;
DROP POLICY IF EXISTS "Managers can delete event products" ON public.event_products;

CREATE POLICY "Users can view company event products" ON public.event_products
  FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events));

CREATE POLICY "Managers can insert company event products" ON public.event_products
  FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company event products" ON public.event_products
  FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company event products" ON public.event_products
  FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 4. Fix event_staff: scope through events table
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view event staff" ON public.event_staff;
DROP POLICY IF EXISTS "Managers can insert event staff" ON public.event_staff;
DROP POLICY IF EXISTS "Managers can update event staff" ON public.event_staff;
DROP POLICY IF EXISTS "Managers can delete event staff" ON public.event_staff;

CREATE POLICY "Users can view company event staff" ON public.event_staff
  FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events));

CREATE POLICY "Managers can insert company event staff" ON public.event_staff
  FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can update company event staff" ON public.event_staff
  FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Managers can delete company event staff" ON public.event_staff
  FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 5. Fix incident_reports: scope through events table
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Managers can insert incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Managers can update incident reports" ON public.incident_reports;
DROP POLICY IF EXISTS "Managers can delete incident reports" ON public.incident_reports;

CREATE POLICY "Users can view company incident reports" ON public.incident_reports
  FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events));

CREATE POLICY "Users can insert company incident reports" ON public.incident_reports
  FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events));

CREATE POLICY "Managers can update company incident reports" ON public.incident_reports
  FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR reported_by_user_id = auth.uid()));

CREATE POLICY "Managers can delete company incident reports" ON public.incident_reports
  FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 6. Fix booking_requests: add company_id scoping to SELECT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can view booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners and managers can update booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners and managers can delete booking requests" ON public.booking_requests;

CREATE POLICY "Owners and managers can view company bookings" ON public.booking_requests
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company_id() OR company_id IS NULL) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Owners and managers can update company bookings" ON public.booking_requests
  FOR UPDATE TO authenticated
  USING ((company_id = get_user_company_id() OR company_id IS NULL) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Owners and managers can delete company bookings" ON public.booking_requests
  FOR DELETE TO authenticated
  USING ((company_id = get_user_company_id() OR company_id IS NULL) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

-- ============================================================
-- 7. Fix organization_settings: add company_id for tenant isolation
-- ============================================================
ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill: try to assign to the first company found (single-tenant bootstrap)
UPDATE public.organization_settings os
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE os.company_id IS NULL;

DROP POLICY IF EXISTS "Authenticated users can view org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Owners can view org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Owners can insert org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Owners can update org settings" ON public.organization_settings;

CREATE POLICY "Users can view company org settings" ON public.organization_settings
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Owners can insert company org settings" ON public.organization_settings
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update company org settings" ON public.organization_settings
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND has_role(auth.uid(), 'owner'));

-- ============================================================
-- 8. Fix crew_availability: scope owner view to company
-- ============================================================
DROP POLICY IF EXISTS "Owners can view all availability" ON public.crew_availability;

CREATE POLICY "Owners can view company availability" ON public.crew_availability
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner') AND
    user_id IN (
      SELECT p2.user_id FROM public.profiles p2
      WHERE p2.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- 9. Fix portal_tokens: scope through events table
-- ============================================================
DROP POLICY IF EXISTS "Owners and managers can view portal tokens" ON public.portal_tokens;

CREATE POLICY "Managers can view company portal tokens" ON public.portal_tokens
  FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
