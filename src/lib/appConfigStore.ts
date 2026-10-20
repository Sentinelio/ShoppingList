// ── Global App Configuration Store ──────────────────────────────────────
// Syncs admin configuration to PocketBase so ALL users see the same settings.
// Writes are admin-only on the server; for everyone else they fail silently.

import { pb, IS_DEMO, upsertByKey } from "./pocketbase";

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

// ── Write: save to localStorage + PocketBase ───────────────────────────

export async function saveConfig(key: ConfigKey, value: unknown) {
  // localStorage is already written by the caller — we only sync to the server
  if (!IS_DEMO) {
    try {
      await upsertByKey("app_config", key, { value });
    } catch { /* not an admin, or offline */ }
  }
}

// ── Read: fetch config from PocketBase → apply to localStorage ─────────
// SAFETY: only overwrites a localStorage key if the server has a non-null,
// non-empty value for it. Never writes empty objects or null.

export async function loadRemoteConfig(): Promise<boolean> {
  if (IS_DEMO) return false;
  try {
    const data = await pb.collection("app_config").getFullList<{ key: string; value: unknown }>({ fields: "key,value" });
    if (data.length === 0) return false;

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
  } catch { /* offline */ }
  return false;
}

// ── Push all localStorage to PocketBase (called from admin on init) ────

export async function pushAllConfigToRemote() {
  if (IS_DEMO) return;
  const rows: Array<{ key: string; value: unknown }> = [];
  for (const key of CONFIG_KEYS) {
    const lsKey = LS_KEY_MAP[key];
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const value = JSON.parse(raw);
        rows.push({ key, value });
      }
    } catch { /* skip malformed */ }
  }
  if (rows.length === 0) return;
  try {
    await Promise.all(rows.map(r => upsertByKey("app_config", r.key, { value: r.value })));
  } catch { /* not an admin, or offline */ }
}
