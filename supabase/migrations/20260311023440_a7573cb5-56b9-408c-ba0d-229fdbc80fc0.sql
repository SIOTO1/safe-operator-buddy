
-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  equipment_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  reported_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  reported_by_user_id UUID NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  date_reported DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view incident reports"
  ON public.incident_reports FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert incident reports"
  ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update incident reports"
  ON public.incident_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR reported_by_user_id = auth.uid());

CREATE POLICY "Managers can delete incident reports"
  ON public.incident_reports FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', true);

-- Storage RLS
CREATE POLICY "Authenticated users can upload incident photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incident-photos');

CREATE POLICY "Anyone can view incident photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'incident-photos');

CREATE POLICY "Managers can delete incident photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'incident-photos' AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
