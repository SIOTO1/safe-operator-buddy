
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_id ON public.crm_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_company_id ON public.crm_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_company_id ON public.crm_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON public.payments(event_id);
