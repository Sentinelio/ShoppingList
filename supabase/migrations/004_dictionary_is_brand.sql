-- ============================================================
-- 004_dictionary_is_brand.sql
-- Mark entries that represent brand/trademarked products so the
-- app can skip translation for them and show them identically
-- across all languages (Coca-Cola, Nutella, Kleenex, …).
-- ============================================================

ALTER TABLE dictionary
    ADD COLUMN IF NOT EXISTS is_brand boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dictionary_is_brand
    ON dictionary (is_brand)
    WHERE is_brand = true;
