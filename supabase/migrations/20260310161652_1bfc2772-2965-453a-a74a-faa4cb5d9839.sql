
-- Fix overly permissive insert policy
DROP POLICY "Service can insert notifications" ON public.notifications;

CREATE POLICY "Users can receive notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
