
-- Create job status enum
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');

-- Create job type enum
CREATE TYPE public.job_type AS ENUM ('email_notification', 'balance_charge', 'weather_check', 'report_generation');

-- Create the jobs table
CREATE TABLE public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type public.job_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.job_status NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  processed_at timestamptz,
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can manage jobs (workers run as service role)
CREATE POLICY "Service role can manage jobs"
  ON public.background_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Owners can view jobs for monitoring
CREATE POLICY "Owners can view jobs"
  ON public.background_jobs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'owner'));

-- Performance indexes
CREATE INDEX idx_background_jobs_status_scheduled ON public.background_jobs(status, scheduled_for) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_background_jobs_job_type ON public.background_jobs(job_type);
CREATE INDEX idx_background_jobs_created_at ON public.background_jobs(created_at);

-- Helper function to enqueue a job
CREATE OR REPLACE FUNCTION public.enqueue_job(
  _job_type public.job_type,
  _payload jsonb DEFAULT '{}'::jsonb,
  _priority integer DEFAULT 0,
  _scheduled_for timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.background_jobs (job_type, payload, priority, scheduled_for, created_by)
  VALUES (_job_type, _payload, _priority, _scheduled_for, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
