
-- Booking requests table (public-facing, no auth required for insert)
CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  event_date date NOT NULL,
  event_time text,
  event_end_time text,
  event_location text NOT NULL,
  equipment text[] NOT NULL DEFAULT '{}',
  special_requests text,
  guest_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can insert booking requests" ON public.booking_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only owners can view/manage
CREATE POLICY "Owners can view booking requests" ON public.booking_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update booking requests" ON public.booking_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete booking requests" ON public.booking_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
