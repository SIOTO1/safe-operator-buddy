
-- Equipment catalog table (max 20 items per org, simple inventory)
CREATE TABLE public.equipment_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;

-- Owners and managers can do everything with equipment
CREATE POLICY "Owners and managers can manage equipment"
  ON public.equipment_catalog FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Anyone can view active equipment (for the public booking form)
CREATE POLICY "Anyone can view active equipment"
  ON public.equipment_catalog FOR SELECT
  USING (is_active = true);

-- Booking notes table
CREATE TABLE public.booking_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can manage booking notes"
  ON public.booking_notes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Updated at trigger for equipment
CREATE TRIGGER update_equipment_catalog_updated_at
  BEFORE UPDATE ON public.equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
