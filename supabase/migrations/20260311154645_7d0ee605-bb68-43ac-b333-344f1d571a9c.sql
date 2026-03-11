
-- CRITICAL: Prevent users from changing their own company_id (privilege escalation)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND company_id = get_user_company_id());

-- Fix: Anonymous booking requests must have status = 'pending'
DROP POLICY IF EXISTS "Anyone can insert booking requests" ON public.booking_requests;
CREATE POLICY "Anyone can insert booking requests"
ON public.booking_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');

-- Fix: Scope background_jobs to company
DROP POLICY IF EXISTS "Owners can view jobs" ON public.background_jobs;
CREATE POLICY "Owners can view company jobs"
ON public.background_jobs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  AND (created_by IN (SELECT user_id FROM public.profiles WHERE company_id = get_user_company_id()) OR created_by IS NULL)
);
