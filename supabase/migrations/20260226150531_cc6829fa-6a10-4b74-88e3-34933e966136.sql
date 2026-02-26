-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Owners can view booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners can update booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Owners can delete booking requests" ON public.booking_requests;

-- Recreate with owner OR manager access
CREATE POLICY "Owners and managers can view booking requests"
  ON public.booking_requests FOR SELECT
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Owners and managers can update booking requests"
  ON public.booking_requests FOR UPDATE
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Owners and managers can delete booking requests"
  ON public.booking_requests FOR DELETE
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));