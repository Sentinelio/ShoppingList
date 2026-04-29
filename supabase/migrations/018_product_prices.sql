-- ============================================================
-- 018_product_prices.sql  –  Cross-user shared price knowledge
-- ============================================================
-- A global price book keyed by a normalized product identity
-- (lowercased name + optional brand). Mirrors every priced row
-- of item_prices via a trigger so users in any list can see the
-- average price for a product without entering it themselves.
--
-- RLS is permissive on SELECT so the data is shared across all
-- users (single global pool for now). When we later want
-- per-user scoping, restrict SELECT by added_by = auth.uid().

CREATE TABLE product_prices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key           text NOT NULL,
  product_name          text NOT NULL,
  brand                 text,
  store                 text,
  price_value           numeric(10,2) NOT NULL,
  currency              text NOT NULL DEFAULT 'EUR',
  added_by              uuid,
  added_by_name         text,
  source_item_price_id  uuid,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_product_prices_key ON product_prices(product_key);
CREATE INDEX idx_product_prices_source ON product_prices(source_item_price_id);

ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_prices_select_all" ON product_prices FOR SELECT USING (true);
CREATE POLICY "product_prices_insert_all" ON product_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "product_prices_delete_own" ON product_prices FOR DELETE USING (
  added_by = auth.uid() OR added_by IS NULL
);

-- Realtime so card averages refresh as soon as a peer logs a price
ALTER PUBLICATION supabase_realtime ADD TABLE product_prices;

-- Normalized identity used to group prices for the same product.
-- Kept consistent with the TypeScript helper in src/lib/itemData.ts.
CREATE OR REPLACE FUNCTION compute_product_key(p_name text, p_brand text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g')) ||
         CASE
           WHEN p_brand IS NOT NULL AND length(trim(p_brand)) > 0
             THEN '|' || lower(regexp_replace(trim(p_brand), '\s+', ' ', 'g'))
           ELSE ''
         END;
$$;

-- After each priced item_prices insert, mirror into product_prices
-- using the linked items row to derive the canonical name and brand.
CREATE OR REPLACE FUNCTION mirror_item_price_to_product_prices()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_name  text;
  v_brand text;
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

  INSERT INTO product_prices (
    product_key, product_name, brand, store,
    price_value, currency, added_by, added_by_name,
    source_item_price_id, created_at
  ) VALUES (
    compute_product_key(v_name, v_brand), v_name, v_brand, NEW.store,
    NEW.price_value, NEW.currency, NEW.added_by, NEW.added_by_name,
    NEW.id, NEW.created_at
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mirror_item_price
AFTER INSERT ON item_prices
FOR EACH ROW
EXECUTE FUNCTION mirror_item_price_to_product_prices();

-- Keep product_prices in sync if the source row gets deleted.
CREATE OR REPLACE FUNCTION delete_product_prices_for_item_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM product_prices WHERE source_item_price_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_product_prices_for_item_price
AFTER DELETE ON item_prices
FOR EACH ROW
EXECUTE FUNCTION delete_product_prices_for_item_price();

-- Backfill historical priced rows so the new card label has data
-- on day one rather than only for purchases logged after the migration.
INSERT INTO product_prices (
  product_key, product_name, brand, store,
  price_value, currency, added_by, added_by_name,
  source_item_price_id, created_at
)
SELECT
  compute_product_key(i.original, NULLIF(i.brand, '')),
  i.original,
  NULLIF(i.brand, ''),
  ip.store,
  ip.price_value,
  ip.currency,
  ip.added_by,
  ip.added_by_name,
  ip.id,
  ip.created_at
FROM item_prices ip
JOIN items i ON i.id = ip.item_id
WHERE ip.price_value IS NOT NULL
ON CONFLICT DO NOTHING;
