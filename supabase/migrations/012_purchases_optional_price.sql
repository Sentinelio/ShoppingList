-- Allow item_prices rows without explicit store/price
-- When a user just marks an item as "done", we log a purchase row
-- with nulls. Stats counts these as purchases but money/store
-- breakdowns ignore them.

ALTER TABLE item_prices ALTER COLUMN store DROP NOT NULL;
ALTER TABLE item_prices ALTER COLUMN price_value DROP NOT NULL;
