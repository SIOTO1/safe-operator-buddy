
-- =============================================
-- PERFORMANCE INDEXES FOR SCALE (500 companies, 50K+ rows)
-- =============================================

-- Events: company_id is used in every RLS policy check
CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events (company_id);

-- Events: event_date range queries (calendar, scheduling, availability)
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events (event_date);

-- Event products: event_id lookups (inventory checks, calendar joins)
CREATE INDEX IF NOT EXISTS idx_event_products_event_id ON public.event_products (event_id);

-- Event products: product_id lookups (availability calculation)
CREATE INDEX IF NOT EXISTS idx_event_products_product_id ON public.event_products (product_id);

-- Event products: composite for availability queries (date + product)
CREATE INDEX IF NOT EXISTS idx_event_products_product_event ON public.event_products (product_id, event_id);

-- Event assignments: event_id for RLS cascaded checks
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_id ON public.event_assignments (event_id);

-- Event staff: event_id for RLS cascaded checks
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON public.event_staff (event_id);

-- Event equipment: event_id for RLS cascaded checks
CREATE INDEX IF NOT EXISTS idx_event_equipment_event_id ON public.event_equipment (event_id);

-- Incident reports: event_id for RLS cascaded checks
CREATE INDEX IF NOT EXISTS idx_incident_reports_event_id ON public.incident_reports (event_id);

-- Payments: event_id for payment lookups per event
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON public.payments (event_id);

-- Payments: quote_id for CRM payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments (quote_id);

-- Payments: stripe_session_id for idempotency checks
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON public.payments (stripe_session_id);

-- CRM notes: company_id for tenant filtering
CREATE INDEX IF NOT EXISTS idx_crm_notes_company_id ON public.crm_notes (company_id);

-- CRM notes: lead_id for lead detail page
CREATE INDEX IF NOT EXISTS idx_crm_notes_lead_id ON public.crm_notes (lead_id);

-- CRM tasks: lead_id for lead detail page
CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON public.crm_tasks (lead_id);

-- CRM activity log: company_id for tenant filtering
CREATE INDEX IF NOT EXISTS idx_crm_activity_company_id ON public.crm_activity_log (company_id);

-- CRM activity log: lead_id for lead detail page
CREATE INDEX IF NOT EXISTS idx_crm_activity_lead_id ON public.crm_activity_log (lead_id);

-- CRM deals: lead_id for lead detail page
CREATE INDEX IF NOT EXISTS idx_crm_deals_lead_id ON public.crm_deals (lead_id);

-- Booking requests: company_id for tenant filtering
CREATE INDEX IF NOT EXISTS idx_booking_requests_company_id ON public.booking_requests (company_id);

-- Booking requests: event_id for event detail lookups
CREATE INDEX IF NOT EXISTS idx_booking_requests_event_id ON public.booking_requests (event_id);

-- Delivery routes: company_id for tenant filtering
CREATE INDEX IF NOT EXISTS idx_delivery_routes_company_id ON public.delivery_routes (company_id);

-- Route stops: route_id for route detail page
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON public.route_stops (route_id);

-- Employees: company_id for tenant filtering (RLS)
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees (company_id);

-- Employee certifications: employee_id for cascaded RLS
CREATE INDEX IF NOT EXISTS idx_employee_certs_employee_id ON public.employee_certifications (employee_id);

-- Products: company_id for tenant filtering
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products (company_id);

-- Quotes: company_id for tenant filtering
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes (company_id);

-- Quotes: lead_id for CRM detail page
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON public.quotes (lead_id);

-- Contracts: quote_id for cascaded RLS
CREATE INDEX IF NOT EXISTS idx_contracts_quote_id ON public.contracts (quote_id);

-- Contracts: event_id for event detail
CREATE INDEX IF NOT EXISTS idx_contracts_event_id ON public.contracts (event_id);

-- Notifications: user_id for per-user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);

-- Notifications: user_id + is_read for unread count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Profiles: user_id for auth lookups (most critical)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Profiles: company_id for tenant lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles (company_id);

-- User roles: user_id for role checks (called on every RLS evaluation)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Organization settings: company_id
CREATE INDEX IF NOT EXISTS idx_org_settings_company_id ON public.organization_settings (company_id);

-- Portal tokens: token for lookup
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON public.portal_tokens (token);

-- Rate limit hits: cleanup and lookup
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_hits (identifier, action, created_at);
