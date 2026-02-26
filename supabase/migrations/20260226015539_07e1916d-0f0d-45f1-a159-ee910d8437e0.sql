
-- Organization settings table (single row)
CREATE TABLE public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  logo_url text,
  phone text,
  email text,
  address text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Only owners can view
CREATE POLICY "Owners can view org settings"
ON public.organization_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Only owners can insert
CREATE POLICY "Owners can insert org settings"
ON public.organization_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Only owners can update
CREATE POLICY "Owners can update org settings"
ON public.organization_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- All authenticated users can view (for displaying company info)
CREATE POLICY "Authenticated users can view org settings"
ON public.organization_settings FOR SELECT
TO authenticated
USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow owners to upload logos
CREATE POLICY "Owners can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'owner'));

-- Allow owners to update logos
CREATE POLICY "Owners can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'owner'));

-- Allow owners to delete logos
CREATE POLICY "Owners can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'owner'));

-- Anyone can view logos (public bucket)
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');
