
-- Remove the materialized view from PostgREST API exposure
ALTER MATERIALIZED VIEW public.company_dashboard_stats SET SCHEMA extensions;

-- Re-create the unique index on the new schema
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_company ON extensions.company_dashboard_stats (company_id);

-- Drop and recreate the refresh function to target new schema
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY extensions.company_dashboard_stats;
END;
$$;

-- Create a secure RPC to read dashboard stats for the current user's company
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_jsonb(s.*) FROM extensions.company_dashboard_stats s
  WHERE s.company_id = get_user_company_id()
  LIMIT 1
$$;
