// ── Global App Configuration Store ──────────────────────────────────────
// Syncs admin configuration to Supabase so ALL users see the same settings.

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
  // localStorage is already written by the caller — we only sync to Supabase
  if (!IS_DEMO && supabase) {
    try {
      await supabase
        .from("app_config")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    } catch { /* table might not exist yet */ }
  }
}

// ── Read: fetch config from Supabase → apply to localStorage ───────────
// SAFETY: only overwrites a localStorage key if Supabase has a non-null,
// non-empty value for it. Never writes empty objects or null.

export async function loadRemoteConfig(): Promise<boolean> {
  if (IS_DEMO || !supabase) return false;
  try {
    const { data, error } = await supabase.from("app_config").select("key, value");
    if (error || !data || !Array.isArray(data) || data.length === 0) return false;

    let applied = false;
    for (const row of data) {
      const lsKey = LS_KEY_MAP[row.key as ConfigKey];
      if (!lsKey) continue;

      // Skip null, undefined, empty objects, empty arrays
      const v = row.value;
      if (v == null) continue;
      if (typeof v === "object" && Object.keys(v as object).length === 0) continue;
      if (Array.isArray(v) && v.length === 0) continue;

      try {
        localStorage.setItem(lsKey, JSON.stringify(v));
        applied = true;
      } catch { /* quota */ }
    }
    return applied;
  } catch { /* table might not exist yet */ }
  return false;
}

// ── Push all localStorage to Supabase (called from admin on init) ──────

export async function pushAllConfigToRemote() {
  if (IS_DEMO || !supabase) return;
  const rows: Array<{ key: string; value: unknown; updated_at: string }> = [];
  for (const key of CONFIG_KEYS) {
    const lsKey = LS_KEY_MAP[key];
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const value = JSON.parse(raw);
        rows.push({ key, value, updated_at: new Date().toISOString() });
      }
    } catch { /* skip malformed */ }
  }
  if (rows.length === 0) return;
  try {
    await supabase.from("app_config").upsert(rows, { onConflict: "key" });
  } catch { /* table might not exist yet */ }
}
