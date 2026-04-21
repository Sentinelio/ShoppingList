-- ============================================================
-- 017_receipts.sql  –  Receipt importer: parsed receipts + lines
-- ============================================================
-- Stores imported shopping receipts (paragons/tickets) and their
-- individual parsed lines. Each receipt_item may link back to an
-- existing items row via matched_item_id when the importer can
-- confidently match the raw product name.

-- ── RECEIPTS ───────────────────────────────────────────────
CREATE TABLE receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  store           text,
  store_address   text,
  nip             text,
  receipt_date    timestamptz,
  currency        text NOT NULL DEFAULT 'EUR',
  total           numeric(10,2),
  photo_url       text,
  raw_json        jsonb,
  added_by        uuid,
  added_by_name   text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_receipts_list_id ON receipts(list_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date DESC);
CREATE INDEX idx_receipts_store ON receipts(store);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_select_all" ON receipts FOR SELECT USING (true);
CREATE POLICY "receipts_insert_all" ON receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "receipts_update_all" ON receipts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "receipts_delete_all" ON receipts FOR DELETE USING (true);

-- ── RECEIPT ITEMS ──────────────────────────────────────────
CREATE TABLE receipt_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id       uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  matched_item_id  uuid REFERENCES items(id) ON DELETE SET NULL,
  raw_name         text NOT NULL,
  expanded_name    text,
  brand            text,
  qty              numeric(10,3),
  unit             text,
  unit_price       numeric(10,2),
  total_price      numeric(10,2),
  discount         numeric(10,2) DEFAULT 0,
  tax_category     text,
  confidence       text,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_matched ON receipt_items(matched_item_id);

ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt_items_select_all" ON receipt_items FOR SELECT USING (true);
CREATE POLICY "receipt_items_insert_all" ON receipt_items FOR INSERT WITH CHECK (true);
CREATE POLICY "receipt_items_update_all" ON receipt_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "receipt_items_delete_all" ON receipt_items FOR DELETE USING (true);

-- Realtime so members see imported tickets immediately
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE receipt_items;

-- ── STORAGE BUCKET for receipt photos ──────────────────────
-- The client uploads the paragon image here before calling the
-- parse-receipt edge function with the public URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-photos', 'receipt-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipt_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipt-photos');
CREATE POLICY "receipt_photos_anon_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipt-photos');
