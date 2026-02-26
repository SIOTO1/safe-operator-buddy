
-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  notes text,
  crew_needed integer NOT NULL DEFAULT 2,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- All authenticated can view events
CREATE POLICY "Authenticated users can view events" ON public.events
  FOR SELECT TO authenticated USING (true);

-- Owners and managers can insert events
CREATE POLICY "Owners can insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Crew availability table
CREATE TABLE public.crew_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  available_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, available_date)
);

ALTER TABLE public.crew_availability ENABLE ROW LEVEL SECURITY;

-- Users can manage their own availability
CREATE POLICY "Users can view own availability" ON public.crew_availability
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own availability" ON public.crew_availability
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability" ON public.crew_availability
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability" ON public.crew_availability
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Owners can view all availability
CREATE POLICY "Owners can view all availability" ON public.crew_availability
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Event assignments table
CREATE TABLE public.event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated can view assignments
CREATE POLICY "Authenticated users can view assignments" ON public.event_assignments
  FOR SELECT TO authenticated USING (true);

-- Owners can manage assignments
CREATE POLICY "Owners can insert assignments" ON public.event_assignments
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update assignments" ON public.event_assignments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can delete assignments" ON public.event_assignments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Crew can update their own assignment status (confirm/decline)
CREATE POLICY "Users can update own assignment status" ON public.event_assignments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_assignments;
