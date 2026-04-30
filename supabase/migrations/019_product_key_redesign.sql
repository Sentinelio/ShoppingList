-- ============================================================
-- 019_product_key_redesign.sql  –  Brand-agnostic product_key + country
-- ============================================================
-- Two changes that unblock cross-list product stats and per-country prices:
--
-- 1) product_key now ignores brand. "Leche Pascual" and "Leche Mercadona"
--    share the same canonical key ("leche") so the price-by-brand panel
--    can compare them, and so user stats can sum all milk purchases
--    regardless of which brand was on the receipt.
--
-- 2) product_prices.country lets us filter the price book by the country
--    the buyer set in onboarding. A user in PL sees only prices logged by
--    other PL users (and their own); ES users see ES prices.
--
-- Also adds a cascade trigger so editing items.brand or items.original
-- (typo fix: "Pscual" → "Pascual") propagates to the product_prices rows
-- that were mirrored from this item.

-- 1. Add country column + composite index
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS country text;
CREATE INDEX IF NOT EXISTS idx_product_prices_key_country ON product_prices(product_key, country);

-- 2. Backfill country from each row's author
UPDATE product_prices pp
SET country = u.country
FROM users u
WHERE pp.added_by = u.id AND pp.country IS NULL;

-- 3. Redefine compute_product_key to ignore the brand argument
--    (kept in signature so existing call sites don't need to change).
CREATE OR REPLACE FUNCTION compute_product_key(p_name text, p_brand text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
$$;

-- 4. Re-key the existing rows under the new (name-only) scheme
UPDATE product_prices SET product_key = compute_product_key(product_name, NULL);

-- 5. Update the mirror trigger to write the country alongside each new row
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
    price_value, currency, added_by, added_by_name,
    source_item_price_id, country, created_at
  ) VALUES (
    compute_product_key(v_name, NULL), v_name, v_brand, NEW.store,
    NEW.price_value, NEW.currency, NEW.added_by, NEW.added_by_name,
    NEW.id, v_country, NEW.created_at
  );

  RETURN NEW;
END;
$$;

-- 6. Cascade item edits to the mirrored product_prices rows.
--    Brand fix → updates brand on every product_prices row that came from
--    this item's purchases. Name fix → updates name + recomputes key.
CREATE OR REPLACE FUNCTION cascade_item_changes_to_product_prices()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.brand IS DISTINCT FROM OLD.brand THEN
    UPDATE product_prices pp
    SET brand = NULLIF(NEW.brand, '')
    WHERE pp.source_item_price_id IN (
      SELECT id FROM item_prices WHERE item_id = NEW.id
    );
  END IF;

  IF NEW.original IS DISTINCT FROM OLD.original THEN
    UPDATE product_prices pp
    SET product_name = NEW.original,
        product_key  = compute_product_key(NEW.original, NULL)
    WHERE pp.source_item_price_id IN (
      SELECT id FROM item_prices WHERE item_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_item_changes ON items;
CREATE TRIGGER trg_cascade_item_changes
AFTER UPDATE OF brand, original ON items
FOR EACH ROW
EXECUTE FUNCTION cascade_item_changes_to_product_prices();
