-- ============================================================
-- 020_price_qty_unit.sql  –  Per-unit price tracking
-- ============================================================
-- Receipts for weighed goods (chicken thighs, fruit by kg, etc.)
-- record both a unit_price (e.g. 13.99 zł/kg) and a total_price
-- (the weight × unit price for that purchase). Storing only the
-- total in item_prices.price_value made the price book useless
-- for these items: two trays of chicken at the same shelf price
-- looked like two different prices because the weights differed.
--
-- This migration adds qty + unit columns alongside price_value so
-- new prices can be saved as per-kg / per-L values, with the total
-- recoverable as price_value × qty. Legacy rows leave qty NULL,
-- which is treated as "qty = 1" by stats so old totals still work.

ALTER TABLE item_prices ADD COLUMN IF NOT EXISTS qty numeric;
ALTER TABLE item_prices ADD COLUMN IF NOT EXISTS unit text;

ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS qty numeric;
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS unit text;

-- Mirror trigger now propagates qty + unit so the shared price book
-- stays consistent with the source row.
CREATE OR REPLACE FUNCTION mirror_item_price_to_product_prices()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_name    text;
  v_brand   text;
  v_country text;
BEGIN
  IF NEW.price_value IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT original, NULLIF(brand, '')
    INTO v_name, v_brand
  FROM items
  WHERE id = NEW.item_id;

  IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT country INTO v_country FROM users WHERE id = NEW.added_by;

  INSERT INTO product_prices (
    product_key, product_name, brand, store,
    price_value, currency, qty, unit,
    added_by, added_by_name,
    source_item_price_id, country, created_at
  ) VALUES (
    compute_product_key(v_name, NULL), v_name, v_brand, NEW.store,
    NEW.price_value, NEW.currency, NEW.qty, NEW.unit,
    NEW.added_by, NEW.added_by_name,
    NEW.id, v_country, NEW.created_at
  );

  RETURN NEW;
END;
$$;
