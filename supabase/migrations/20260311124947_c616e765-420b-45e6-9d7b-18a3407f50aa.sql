
-- Create a server-side function to validate and insert event_products atomically
-- This prevents race conditions where multiple concurrent requests could overbook
CREATE OR REPLACE FUNCTION public.assign_event_products(
  _event_id uuid,
  _products jsonb -- array of {pid: uuid, quantity: int}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _event_date date;
  _item jsonb;
  _product_id uuid;
  _requested_qty int;
  _available_qty int;
  _allocated_qty int;
  _remaining int;
  _results jsonb := '[]'::jsonb;
BEGIN
  -- Get the event date
  SELECT event_date INTO _event_date FROM public.events WHERE id = _event_id;
  IF _event_date IS NULL THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;

  -- Lock the relevant product rows to prevent concurrent overbooking
  PERFORM 1 FROM public.products
  WHERE id IN (SELECT (j->>'pid')::uuid FROM jsonb_array_elements(_products) j)
  FOR UPDATE;

  FOR _item IN SELECT * FROM jsonb_array_elements(_products)
  LOOP
    _product_id := (_item->>'pid')::uuid;
    _requested_qty := COALESCE((_item->>'quantity')::int, (_item->>'q')::int, 1);

    -- Get total available
    SELECT quantity_available INTO _available_qty
    FROM public.products WHERE id = _product_id;

    IF _available_qty IS NULL THEN
      CONTINUE; -- skip unknown products
    END IF;

    -- Get already allocated on this date (excluding current event)
    SELECT COALESCE(SUM(ep.quantity), 0) INTO _allocated_qty
    FROM public.event_products ep
    INNER JOIN public.events e ON e.id = ep.event_id
    WHERE e.event_date = _event_date
      AND ep.product_id = _product_id
      AND ep.event_id != _event_id;

    _remaining := _available_qty - _allocated_qty;

    IF _requested_qty > _remaining THEN
      RETURN jsonb_build_object(
        'error', format('Insufficient inventory for product %s: requested %s but only %s available', _product_id, _requested_qty, _remaining)
      );
    END IF;

    -- Insert the assignment
    INSERT INTO public.event_products (event_id, product_id, quantity)
    VALUES (_event_id, _product_id, _requested_qty)
    ON CONFLICT (event_id, product_id) DO UPDATE SET quantity = event_products.quantity + _requested_qty;

    _results := _results || jsonb_build_object('product_id', _product_id, 'assigned', _requested_qty);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'assigned', _results);
END;
$$;
