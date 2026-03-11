
-- Rate limit tracking table using sliding window approach
CREATE TABLE public.rate_limit_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS - only service role manages this
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limit_hits FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for fast lookups by identifier + action + time window
CREATE INDEX idx_rate_limit_hits_lookup
  ON public.rate_limit_hits (identifier, action, created_at DESC);

-- Cleanup old entries automatically (keep only last 5 minutes)
CREATE INDEX idx_rate_limit_hits_cleanup
  ON public.rate_limit_hits (created_at);

-- Function to check and record a rate limit hit
-- Returns true if allowed, false if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action text,
  _max_requests integer,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _window_start timestamptz;
BEGIN
  _window_start := now() - (_window_seconds || ' seconds')::interval;

  -- Count recent hits
  SELECT COUNT(*) INTO _count
  FROM public.rate_limit_hits
  WHERE identifier = _identifier
    AND action = _action
    AND created_at > _window_start;

  -- If over limit, deny
  IF _count >= _max_requests THEN
    RETURN false;
  END IF;

  -- Record the hit
  INSERT INTO public.rate_limit_hits (identifier, action)
  VALUES (_identifier, _action);

  -- Opportunistic cleanup: delete old entries (older than 5 min)
  DELETE FROM public.rate_limit_hits
  WHERE created_at < now() - interval '5 minutes';

  RETURN true;
END;
$$;
