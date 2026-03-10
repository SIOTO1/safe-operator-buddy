
ALTER TABLE public.quote_items
  ADD COLUMN product_name text NOT NULL DEFAULT '',
  ADD COLUMN total_price numeric NOT NULL DEFAULT 0;
