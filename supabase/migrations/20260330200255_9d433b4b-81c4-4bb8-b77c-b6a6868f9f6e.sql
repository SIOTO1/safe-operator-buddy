
-- 1. Make incident-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'incident-photos';

-- 2. Fix incident-photos SELECT policy: restrict to authenticated company members
DROP POLICY IF EXISTS "Anyone can view incident photos" ON storage.objects;
CREATE POLICY "Company members can view incident photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'incident-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.events e
      WHERE e.company_id = public.get_user_company_id()
    )
  );

-- 3. Fix signatures SELECT policy: scope by company via contracts->quotes
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;
CREATE POLICY "Company members can view signatures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      JOIN public.quotes q ON c.quote_id = q.id
      WHERE q.company_id = public.get_user_company_id()
    )
  );

-- 4. Fix equipment-images DELETE policy: scope by company
DROP POLICY IF EXISTS "Authenticated users can delete equipment images" ON storage.objects;
CREATE POLICY "Company managers can delete equipment images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'equipment-images'
    AND (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  );

-- 5. Fix incident_reports SELECT policy: add company_id filter
DROP POLICY IF EXISTS "Users can view company incident reports" ON public.incident_reports;
CREATE POLICY "Users can view company incident reports"
  ON public.incident_reports FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT events.id FROM public.events
      WHERE events.company_id = public.get_user_company_id()
    )
  );

-- 6. Fix incident_reports INSERT policy: add company_id filter
DROP POLICY IF EXISTS "Users can insert company incident reports" ON public.incident_reports;
CREATE POLICY "Users can insert company incident reports"
  ON public.incident_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT events.id FROM public.events
      WHERE events.company_id = public.get_user_company_id()
    )
  );

-- 7. Fix incident_reports DELETE policy: add company_id filter
DROP POLICY IF EXISTS "Managers can delete company incident reports" ON public.incident_reports;
CREATE POLICY "Managers can delete company incident reports"
  ON public.incident_reports FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT events.id FROM public.events
      WHERE events.company_id = public.get_user_company_id()
    )
    AND (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  );

-- 8. Fix incident_reports UPDATE policy: add company_id filter
DROP POLICY IF EXISTS "Managers can update company incident reports" ON public.incident_reports;
CREATE POLICY "Managers can update company incident reports"
  ON public.incident_reports FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT events.id FROM public.events
      WHERE events.company_id = public.get_user_company_id()
    )
    AND (
      public.has_role(auth.uid(), 'owner'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
      OR reported_by_user_id = auth.uid()
    )
  );

-- 9. Fix portal_tokens SELECT policy: add company_id filter
DROP POLICY IF EXISTS "Managers can view company portal tokens" ON public.portal_tokens;
CREATE POLICY "Managers can view company portal tokens"
  ON public.portal_tokens FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT events.id FROM public.events
      WHERE events.company_id = public.get_user_company_id()
    )
    AND (public.has_role(auth.uid(), 'owner'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  );
