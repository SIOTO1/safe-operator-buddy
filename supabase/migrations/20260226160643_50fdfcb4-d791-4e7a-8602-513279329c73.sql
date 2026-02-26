
-- Create storage bucket for equipment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true);

-- Allow authenticated users to upload equipment images
CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

-- Allow public read access
CREATE POLICY "Public can view equipment images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'equipment-images');

-- Allow authenticated users to delete equipment images
CREATE POLICY "Authenticated users can delete equipment images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'equipment-images');
