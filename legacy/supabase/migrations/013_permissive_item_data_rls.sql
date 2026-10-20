-- The app uses custom auth (user_id stored in localStorage + written
-- directly to rows) not Supabase Auth, so auth.uid() always returns NULL.
-- The previous RLS policies using auth.uid() were blocking all writes.
--
-- Strategy: drop the old policies, keep RLS enabled, and add fully
-- permissive policies. Writes are protected by the client (which
-- checks list membership) same way items/list_members are.

-- item_prices
DROP POLICY IF EXISTS "item_prices_select" ON item_prices;
DROP POLICY IF EXISTS "item_prices_insert" ON item_prices;
DROP POLICY IF EXISTS "item_prices_delete" ON item_prices;
DROP POLICY IF EXISTS "item_prices_select_public" ON item_prices;
DROP POLICY IF EXISTS "item_prices_insert_public" ON item_prices;
DROP POLICY IF EXISTS "item_prices_update_public" ON item_prices;
DROP POLICY IF EXISTS "item_prices_delete_public" ON item_prices;

CREATE POLICY "item_prices_select_all" ON item_prices FOR SELECT USING (true);
CREATE POLICY "item_prices_insert_all" ON item_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "item_prices_update_all" ON item_prices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "item_prices_delete_all" ON item_prices FOR DELETE USING (true);

-- item_comments
DROP POLICY IF EXISTS "item_comments_select" ON item_comments;
DROP POLICY IF EXISTS "item_comments_insert" ON item_comments;
DROP POLICY IF EXISTS "item_comments_delete" ON item_comments;
DROP POLICY IF EXISTS "item_comments_select_public" ON item_comments;
DROP POLICY IF EXISTS "item_comments_insert_public" ON item_comments;
DROP POLICY IF EXISTS "item_comments_update_public" ON item_comments;
DROP POLICY IF EXISTS "item_comments_delete_public" ON item_comments;

CREATE POLICY "item_comments_select_all" ON item_comments FOR SELECT USING (true);
CREATE POLICY "item_comments_insert_all" ON item_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "item_comments_update_all" ON item_comments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "item_comments_delete_all" ON item_comments FOR DELETE USING (true);

-- item_history
DROP POLICY IF EXISTS "item_history_select" ON item_history;
DROP POLICY IF EXISTS "item_history_insert" ON item_history;
DROP POLICY IF EXISTS "item_history_select_public" ON item_history;
DROP POLICY IF EXISTS "item_history_insert_public" ON item_history;
DROP POLICY IF EXISTS "item_history_delete_public" ON item_history;

CREATE POLICY "item_history_select_all" ON item_history FOR SELECT USING (true);
CREATE POLICY "item_history_insert_all" ON item_history FOR INSERT WITH CHECK (true);
CREATE POLICY "item_history_delete_all" ON item_history FOR DELETE USING (true);
