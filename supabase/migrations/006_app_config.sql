CREATE TABLE app_config (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_select_public" ON app_config FOR SELECT USING (true);
CREATE POLICY "app_config_insert_public" ON app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "app_config_update_public" ON app_config FOR UPDATE USING (true) WITH CHECK (true);
