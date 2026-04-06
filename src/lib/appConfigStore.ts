// ── Global App Configuration Store ──────────────────────────────────────
// Syncs admin configuration to Supabase so ALL users see the same settings.
//
// Keys stored in app_config table:
//   themes, lab_selection, custom_store_types, custom_categories,
//   cat_mapping, enabled_langs, ui_translations

import { supabase, IS_DEMO } from "./supabase";

export const CONFIG_KEYS = [
  "themes",
  "lab_selection",
  "custom_store_types",
  "custom_categories",
  "cat_mapping",
  "enabled_langs",
  "ui_translations",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

const LS_KEY_MAP: Record<ConfigKey, string> = {
  themes: "babelcart_themes_v1",
  lab_selection: "babelcart_item_detail_lab_v1",
  custom_store_types: "babelcart_custom_store_types",
  custom_categories: "babelcart_custom_categories",
  cat_mapping: "babelcart_custom_cat_mapping",
  enabled_langs: "babelcart_enabled_langs",
  ui_translations: "babelcart_ui_translations",
};

// ── Write: save to localStorage + Supabase ─────────────────────────────

export async function saveConfig(key: ConfigKey, value: unknown) {
  const lsKey = LS_KEY_MAP[key];
  try { localStorage.setItem(lsKey, JSON.stringify(value)); } catch { /* quota */ }

  if (!IS_DEMO && supabase) {
    try {
      await supabase
        .from("app_config")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    } catch { /* table might not exist yet */ }
  }
}

// ── Read: fetch all config from Supabase → apply to localStorage ───────

export async function loadRemoteConfig(): Promise<boolean> {
  if (IS_DEMO || !supabase) return false;
  try {
    const { data, error } = await supabase.from("app_config").select("key, value");
    if (error || !data || !Array.isArray(data) || data.length === 0) return false;
    for (const row of data) {
      const lsKey = LS_KEY_MAP[row.key as ConfigKey];
      if (lsKey && row.value != null) {
        try { localStorage.setItem(lsKey, JSON.stringify(row.value)); } catch { /* quota */ }
      }
    }
    return true;
  } catch { /* table might not exist yet */ }
  return false;
}

// ── Push all localStorage to Supabase (called from admin on init) ──────

export async function pushAllConfigToRemote() {
  if (IS_DEMO || !supabase) return;
  const rows = CONFIG_KEYS.map(key => {
    const lsKey = LS_KEY_MAP[key];
    let value: unknown = {};
    try { const raw = localStorage.getItem(lsKey); if (raw) value = JSON.parse(raw); } catch { /* */ }
    return { key, value, updated_at: new Date().toISOString() };
  });
  try {
    await supabase.from("app_config").upsert(rows, { onConflict: "key" });
  } catch { /* table might not exist yet */ }
}
