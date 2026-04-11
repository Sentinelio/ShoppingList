-- ============================================================
-- 011_item_data.sql  –  Per-item prices, comments, history
-- ============================================================

-- ── ITEM PRICES ─────────────────────────────────────────────
CREATE TABLE item_prices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  store         text NOT NULL,
  price_value   numeric(10,2) NOT NULL,
  currency      text NOT NULL DEFAULT 'EUR',
  added_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  added_by_name text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_item_prices_item_id ON item_prices(item_id);

ALTER TABLE item_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_prices_select" ON item_prices FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_prices.item_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
  )
);

CREATE POLICY "item_prices_insert" ON item_prices FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_prices.item_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
  )
);

CREATE POLICY "item_prices_delete" ON item_prices FOR DELETE USING (
  added_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_prices.item_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'owner'
      AND lm.status = 'active'
  )
);

-- ── ITEM COMMENTS ───────────────────────────────────────────
CREATE TABLE item_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  text          text NOT NULL,
  added_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  added_by_name text,
  added_by_lang text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_item_comments_item_id ON item_comments(item_id);

ALTER TABLE item_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_comments_select" ON item_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_comments.item_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
  )
);

CREATE POLICY "item_comments_insert" ON item_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_comments.item_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
  )
);

CREATE POLICY "item_comments_delete" ON item_comments FOR DELETE USING (
  added_by = auth.uid()
);

-- ── ITEM HISTORY ────────────────────────────────────────────
CREATE TABLE item_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  event_type    text NOT NULL,
  description   text NOT NULL,
  icon          text,
  by_user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  by_user_name  text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_item_history_item_id ON item_history(item_id);

ALTER TABLE item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_history_select" ON item_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_history.item_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
  )
);

CREATE POLICY "item_history_insert" ON item_history FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM items i
    JOIN list_members lm ON lm.list_id = i.list_id
    WHERE i.id = item_history.item_id
      AND lm.user_id = auth.uid()
      AND lm.status = 'active'
  )
);

-- Enable realtime so members see updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE item_prices;
ALTER PUBLICATION supabase_realtime ADD TABLE item_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE item_history;
