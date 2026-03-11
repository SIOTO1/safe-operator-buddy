
-- Create an atomic reschedule function that uses row-level locking
CREATE OR REPLACE FUNCTION public.atomic_reschedule_event(
  _event_id uuid,
  _new_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _event record;
  _ep record;
  _product record;
  _allocated_qty bigint;
  _remaining int;
  _unavailable text[] := '{}';
BEGIN
  -- Lock and fetch the event
  SELECT * INTO _event FROM public.events WHERE id = _event_id FOR UPDATE;
  IF _event IS NULL THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;

  -- Lock all products this event uses
  FOR _ep IN
    SELECT ep.product_id, ep.quantity
    FROM public.event_products ep
    WHERE ep.event_id = _event_id
  LOOP
    -- Lock the product row
    SELECT * INTO _product FROM public.products WHERE id = _ep.product_id FOR UPDATE;
    IF _product IS NULL THEN CONTINUE; END IF;

    -- Count allocated on new date (excluding this event)
    SELECT COALESCE(SUM(ep2.quantity), 0) INTO _allocated_qty
    FROM public.event_products ep2
    INNER JOIN public.events e2 ON e2.id = ep2.event_id
    WHERE e2.event_date = _new_date
      AND ep2.product_id = _ep.product_id
      AND ep2.event_id != _event_id;

    _remaining := _product.quantity_available - _allocated_qty;

    IF _ep.quantity > _remaining THEN
      _unavailable := array_append(_unavailable,
        format('%s (need %s, only %s available)', _product.name, _ep.quantity, GREATEST(0, _remaining))
      );
    END IF;
  END LOOP;

  IF array_length(_unavailable, 1) > 0 THEN
    RETURN jsonb_build_object('error', 'Products unavailable', 'unavailable', to_jsonb(_unavailable));
  END IF;

  -- All checks passed, update the event date
  UPDATE public.events SET event_date = _new_date WHERE id = _event_id;

  -- Update linked booking request
  UPDATE public.booking_requests SET event_date = _new_date WHERE event_id = _event_id;

  RETURN jsonb_build_object('success', true, 'old_date', _event.event_date, 'new_date', _new_date);
END;
$$;
