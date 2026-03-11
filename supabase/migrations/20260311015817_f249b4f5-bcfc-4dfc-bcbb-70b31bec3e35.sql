
-- Create event staff role enum
CREATE TYPE public.event_staff_role AS ENUM ('driver', 'setup_crew', 'supervisor');

-- Create event_staff table
CREATE TABLE public.event_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  role event_staff_role NOT NULL DEFAULT 'setup_crew',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- All authenticated can view (matches events policy)
CREATE POLICY "Authenticated users can view event staff"
  ON public.event_staff FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert event staff"
  ON public.event_staff FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update event staff"
  ON public.event_staff FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete event staff"
  ON public.event_staff FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
