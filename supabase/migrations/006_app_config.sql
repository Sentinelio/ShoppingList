-- ============================================================
-- 006_app_config.sql  –  Global admin configuration store
-- ============================================================
-- Stores admin settings (themes, lab selections, custom categories,
-- languages, etc.) so all users share the same configuration.

CREATE TABLE app_config (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read app config
CREATE POLICY "app_config_select_public" ON app_config
    FOR SELECT USING (true);

-- Everyone can insert app config (admin panel has no auth)
CREATE POLICY "app_config_insert_public" ON app_config
    FOR INSERT WITH CHECK (true);

-- Everyone can update app config
CREATE POLICY "app_config_update_public" ON app_config
    FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE app_config;
