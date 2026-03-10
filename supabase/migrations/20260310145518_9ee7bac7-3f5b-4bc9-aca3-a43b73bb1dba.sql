
-- event_equipment table was partially created, drop and recreate cleanly
DROP TABLE IF EXISTS public.event_equipment;

CREATE TABLE public.event_equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event equipment"
  ON public.event_equipment FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners can insert event equipment"
  ON public.event_equipment FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners can update event equipment"
  ON public.event_equipment FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners can delete event equipment"
  ON public.event_equipment FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
