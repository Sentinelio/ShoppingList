-- The added_by/by_user_id foreign keys on item_prices, item_comments,
-- and item_history can cause inserts to fail if the user.id stored
-- in the client doesn't exist in the users table (e.g. stale cache
-- from a deleted user). The name is already denormalized in the row
-- so we don't actually need referential integrity here.

-- Drop FK constraints, keep the column as a plain uuid.

DO $$
DECLARE fk_name text;
BEGIN
  SELECT conname INTO fk_name FROM pg_constraint
  WHERE conrelid = 'item_prices'::regclass AND contype = 'f'
    AND confrelid = 'users'::regclass;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE item_prices DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

DO $$
DECLARE fk_name text;
BEGIN
  SELECT conname INTO fk_name FROM pg_constraint
  WHERE conrelid = 'item_comments'::regclass AND contype = 'f'
    AND confrelid = 'users'::regclass;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE item_comments DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

DO $$
DECLARE fk_name text;
BEGIN
  SELECT conname INTO fk_name FROM pg_constraint
  WHERE conrelid = 'item_history'::regclass AND contype = 'f'
    AND confrelid = 'users'::regclass;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE item_history DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;
