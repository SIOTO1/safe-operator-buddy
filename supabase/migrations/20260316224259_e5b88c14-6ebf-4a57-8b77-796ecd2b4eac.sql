
-- 1. Fix booking_notes: scope to company via booking_requests
DROP POLICY IF EXISTS "Owners and managers can manage booking notes" ON public.booking_notes;

CREATE POLICY "Company owners and managers can manage booking notes"
ON public.booking_notes
FOR ALL
TO authenticated
USING (
  booking_id IN (
    SELECT id FROM public.booking_requests
    WHERE company_id = get_user_company_id()
  )
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  booking_id IN (
    SELECT id FROM public.booking_requests
    WHERE company_id = get_user_company_id()
  )
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- 2. Fix booking_requests: remove company_id IS NULL branch
DROP POLICY IF EXISTS "Owners and managers can view company bookings" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners and managers can update company bookings" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners and managers can delete company bookings" ON public.booking_requests;

CREATE POLICY "Owners and managers can view company bookings"
ON public.booking_requests FOR SELECT TO authenticated
USING (
  company_id = get_user_company_id()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Owners and managers can update company bookings"
ON public.booking_requests FOR UPDATE TO authenticated
USING (
  company_id = get_user_company_id()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Owners and managers can delete company bookings"
ON public.booking_requests FOR DELETE TO authenticated
USING (
  company_id = get_user_company_id()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- 3. Fix user_roles: drop unrestricted SELECT policy
DROP POLICY IF EXISTS "Owners can view all roles" ON public.user_roles;
