-- ============================================================
-- 003_fk_cascade_and_indexes.sql
-- Adds ON DELETE CASCADE to user-owning FKs so deleting a user
-- doesn't require manual cleanup in application code, and adds
-- indexes on commonly queried FK columns.
-- ============================================================

-- 1. lists.created_by → users.id : CASCADE
-- Drop existing FK (it was created without a name, so find it)
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'lists'::regclass
      AND contype  = 'f'
      AND confrelid = 'users'::regclass;
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lists DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

ALTER TABLE lists
    ADD CONSTRAINT lists_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- 2. items.added_by → users.id : SET NULL
-- We preserve historical items when a user is deleted, but null
-- out the reference so the constraint stays valid.
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'items'::regclass
      AND contype  = 'f'
      AND confrelid = 'users'::regclass;
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE items DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

ALTER TABLE items ALTER COLUMN added_by DROP NOT NULL;

ALTER TABLE items
    ADD CONSTRAINT items_added_by_fkey
    FOREIGN KEY (added_by)
    REFERENCES users(id)
    ON DELETE SET NULL;

-- 3. Indexes on common FK lookups
CREATE INDEX IF NOT EXISTS idx_list_members_user_id
    ON list_members (user_id);

CREATE INDEX IF NOT EXISTS idx_list_members_list_id_status
    ON list_members (list_id, status);

CREATE INDEX IF NOT EXISTS idx_lists_created_by
    ON lists (created_by);

CREATE INDEX IF NOT EXISTS idx_items_added_by
    ON items (added_by);

CREATE INDEX IF NOT EXISTS idx_dictionary_category
    ON dictionary (category);
