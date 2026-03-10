
-- Drivers table
CREATE TABLE public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  license_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company drivers" ON public.drivers
  FOR SELECT TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "Managers can insert company drivers" ON public.drivers
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can update company drivers" ON public.drivers
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can delete company drivers" ON public.drivers
  FOR DELETE TO authenticated USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER set_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vehicles table
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  license_plate text,
  capacity_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "Managers can insert company vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can update company vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can delete company vehicles" ON public.vehicles
  FOR DELETE TO authenticated USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Delivery routes table
CREATE TABLE public.delivery_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  route_date date NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company routes" ON public.delivery_routes
  FOR SELECT TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "Managers can insert company routes" ON public.delivery_routes
  FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can update company routes" ON public.delivery_routes
  FOR UPDATE TO authenticated USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can delete company routes" ON public.delivery_routes
  FOR DELETE TO authenticated USING (company_id = get_user_company_id() AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));

CREATE TRIGGER set_delivery_routes_updated_at BEFORE UPDATE ON public.delivery_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Route stops table
CREATE TABLE public.route_stops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  stop_order integer NOT NULL DEFAULT 0,
  address text,
  lat numeric,
  lng numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view route stops" ON public.route_stops
  FOR SELECT TO authenticated
  USING (route_id IN (SELECT id FROM public.delivery_routes WHERE company_id = get_user_company_id()));
CREATE POLICY "Managers can insert route stops" ON public.route_stops
  FOR INSERT TO authenticated
  WITH CHECK (route_id IN (SELECT id FROM public.delivery_routes WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can update route stops" ON public.route_stops
  FOR UPDATE TO authenticated
  USING (route_id IN (SELECT id FROM public.delivery_routes WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers can delete route stops" ON public.route_stops
  FOR DELETE TO authenticated
  USING (route_id IN (SELECT id FROM public.delivery_routes WHERE company_id = get_user_company_id()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')));
