
-- Materialized view: per-company dashboard stats
-- Refreshed on demand, avoids expensive aggregations on every dashboard load

CREATE MATERIALIZED VIEW IF NOT EXISTS public.company_dashboard_stats AS
SELECT
  c.id AS company_id,
  (SELECT COUNT(*) FROM public.events e WHERE e.company_id = c.id) AS total_events,
  (SELECT COUNT(*) FROM public.events e WHERE e.company_id = c.id AND e.event_date >= CURRENT_DATE) AS upcoming_events,
  (SELECT COUNT(*) FROM public.events e WHERE e.company_id = c.id AND e.event_date = CURRENT_DATE) AS today_events,
  (SELECT COUNT(*) FROM public.crm_leads l WHERE l.company_id = c.id) AS total_leads,
  (SELECT COUNT(*) FROM public.crm_leads l WHERE l.company_id = c.id AND l.stage = 'new') AS new_leads,
  (SELECT COUNT(*) FROM public.crm_deals d WHERE d.company_id = c.id) AS total_deals,
  (SELECT COALESCE(SUM(d.value), 0) FROM public.crm_deals d WHERE d.company_id = c.id AND d.stage = 'won') AS won_revenue,
  (SELECT COUNT(*) FROM public.crm_tasks t WHERE t.company_id = c.id AND t.status != 'done') AS open_tasks,
  (SELECT COUNT(*) FROM public.employees emp WHERE emp.company_id = c.id AND emp.status = 'active') AS active_employees,
  (SELECT COALESCE(SUM(p.amount), 0) FROM public.payments p INNER JOIN public.events ev ON ev.id = p.event_id WHERE ev.company_id = c.id AND p.payment_status = 'completed') AS total_payments,
  (SELECT COUNT(*) FROM public.booking_requests br WHERE br.company_id = c.id AND br.status = 'pending') AS pending_bookings,
  now() AS refreshed_at
FROM public.companies c;

-- Index for fast lookup by company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_company ON public.company_dashboard_stats (company_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.company_dashboard_stats;
END;
$$;
