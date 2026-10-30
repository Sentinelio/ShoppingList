// ── Global App Configuration Store ──────────────────────────────────────
// Syncs admin configuration to PocketBase so ALL users see the same settings.
// Writes are admin-only on the server; a failed write is reported to the
// admin panel (lib/adminErrors.ts), never swallowed.

import { pb, IS_DEMO, upsertByKey } from "./pocketbase";
import { reportAdminError } from "./adminErrors";

export const CONFIG_KEYS = [
  "themes",
  "custom_store_types",
  "custom_categories",
  "cat_mapping",
  "enabled_langs",
  "ui_translations",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

const LS_KEY_MAP: Record<ConfigKey, string> = {
  themes: "babelcart_themes_v1",
  custom_store_types: "babelcart_custom_store_types",
  custom_categories: "babelcart_custom_categories",
  cat_mapping: "babelcart_custom_cat_mapping",
  enabled_langs: "babelcart_enabled_langs",
  ui_translations: "babelcart_ui_translations",
};

// ── Write: save to localStorage + PocketBase ───────────────────────────

export async function saveConfig(key: ConfigKey, value: unknown): Promise<boolean> {
  // localStorage is already written by the caller — we only sync to the server
  if (IS_DEMO) return true;
  try {
    await upsertByKey("app_config", key, { value });
    return true;
  } catch (err) {
    reportAdminError(`Guardar configuración '${key}'`, err);
    return false;
  }
}

// ── Read: fetch config from PocketBase → apply to localStorage ─────────
// The server is the source of truth: any row the admin saved replaces this
// browser's copy, also when it's an empty list (e.g. the last custom
// category removed). Only null rows are skipped.

/** Applies one app_config row to localStorage. True when it changed. */
export function applyConfigRow(key: string, value: unknown): boolean {
  const lsKey = LS_KEY_MAP[key as ConfigKey];
  if (!lsKey || value == null) return false;
  const next = JSON.stringify(value);
  try {
    if (localStorage.getItem(lsKey) === next) return false;
    localStorage.setItem(lsKey, next);
    return true;
  } catch {
    return false; // storage full or blocked
  }
}

/** Fetches every app_config row and applies it. True when something changed. */
export async function loadRemoteConfig(): Promise<boolean> {
  if (IS_DEMO) return false;
  try {
    const data = await pb.collection("app_config").getFullList<{ key: string; value: unknown }>({ fields: "key,value" });
    let changed = false;
    for (const row of data) changed = applyConfigRow(row.key, row.value) || changed;
    return changed;
  } catch (err) {
    console.error("[appConfig] could not load app_config", err);
    return false;
  }
}
