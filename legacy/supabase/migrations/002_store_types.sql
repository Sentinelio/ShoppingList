ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS store_type text DEFAULT 'grocery';
CREATE INDEX IF NOT EXISTS idx_dict_store ON dictionary(store_type);
CREATE INDEX IF NOT EXISTS idx_dict_category ON dictionary(category);
