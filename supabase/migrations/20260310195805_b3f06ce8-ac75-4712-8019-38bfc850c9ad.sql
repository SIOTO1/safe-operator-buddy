
CREATE TABLE public.event_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, product_id)
);

ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event products"
  ON public.event_products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers can insert event products"
  ON public.event_products FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Managers can update event products"
  ON public.event_products FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Managers can delete event products"
  ON public.event_products FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );
