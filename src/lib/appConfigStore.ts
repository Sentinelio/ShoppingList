// ── Global App Configuration Store ──────────────────────────────────────
// Syncs admin configuration to Supabase so ALL users see the same settings.
//
// Keys stored in app_config table:
//   themes            – per-view theme IDs + items layout
//   lab_selection      – item detail lab variant selections
//   custom_store_types – admin-created store types
//   custom_categories  – admin-created categories
//   cat_mapping        – category → store type overrides
//   enabled_langs      – enabled language codes
//   ui_translations    – custom UI translations per language
//
// Flow:
//   Admin changes → write localStorage (instant) + upsert Supabase (async)
//   User app init → fetch all keys from Supabase → apply to localStorage
//   Realtime subscription → push changes to localStorage + notify listeners

import { supabase, IS_DEMO } from "./supabase";

// ── All config keys we sync ────────────────────────────────────────────

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

// Map config keys to their localStorage keys
const LS_KEY_MAP: Record<ConfigKey, string> = {
  themes: "babelcart_themes_v1",
  lab_selection: "babelcart_item_detail_lab_v1",
  custom_store_types: "babelcart_custom_store_types",
  custom_categories: "babelcart_custom_categories",
  cat_mapping: "babelcart_custom_cat_mapping",
  enabled_langs: "babelcart_enabled_langs",
  ui_translations: "babelcart_ui_translations",
};

// ── Listeners for realtime changes ─────────────────────────────────────

type ConfigListener = (key: ConfigKey, value: unknown) => void;
const listeners = new Set<ConfigListener>();

export function onConfigChange(fn: ConfigListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyListeners(key: ConfigKey, value: unknown) {
  listeners.forEach(fn => fn(key, value));
}

// ── Write: save to localStorage + Supabase ─────────────────────────────

export async function saveConfig(key: ConfigKey, value: unknown) {
  // Always write localStorage first (instant for current tab)
  const lsKey = LS_KEY_MAP[key];
  try {
    localStorage.setItem(lsKey, JSON.stringify(value));
  } catch { /* quota */ }

  // Then persist to Supabase (async, fire-and-forget for speed)
  if (!IS_DEMO && supabase) {
    try {
      await supabase
        .from("app_config")
        .upsert(
          { key, value: value as Record<string, unknown>, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
    } catch (err) {
      console.warn("[appConfig] Failed to save to Supabase:", key, err);
    }
  }
}

// ── Read: fetch all config from Supabase → apply to localStorage ───────

export async function loadRemoteConfig(): Promise<boolean> {
  if (IS_DEMO || !supabase) return false;

  try {
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value");

    if (error) {
      console.warn("[appConfig] Failed to load remote config:", error);
      return false;
    }

    if (data && data.length > 0) {
      for (const row of data) {
        const configKey = row.key as ConfigKey;
        const lsKey = LS_KEY_MAP[configKey];
        if (lsKey && row.value != null) {
          try {
            localStorage.setItem(lsKey, JSON.stringify(row.value));
          } catch { /* quota */ }
        }
      }
      return true;
    }
  } catch (err) {
    console.warn("[appConfig] Failed to load remote config:", err);
  }
  return false;
}

// ── Realtime: subscribe to changes pushed by admin ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realtimeChannel: any = null;

export function subscribeToConfigChanges() {
  if (IS_DEMO || !supabase) return;
  if (realtimeChannel) return; // already subscribed

  realtimeChannel = supabase
    .channel("app_config_changes")
    .on(
      "postgres_changes" as "system",
      { event: "*", schema: "public", table: "app_config" } as unknown as Record<string, string>,
      (payload: { new?: { key: string; value: unknown } }) => {
        const row = payload.new;
        if (!row) return;
        const configKey = row.key as ConfigKey;
        const lsKey = LS_KEY_MAP[configKey];
        if (lsKey && row.value != null) {
          try {
            localStorage.setItem(lsKey, JSON.stringify(row.value));
          } catch { /* quota */ }
          notifyListeners(configKey, row.value);
        }
      }
    )
    .subscribe();
}

export function unsubscribeFromConfigChanges() {
  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// ── Convenience: push current localStorage to Supabase (admin init) ────

export async function pushAllConfigToRemote() {
  if (IS_DEMO || !supabase) return;

  const rows = CONFIG_KEYS.map(key => {
    const lsKey = LS_KEY_MAP[key];
    let value: unknown = {};
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) value = JSON.parse(raw);
    } catch { /* ignore */ }
    return { key, value, updated_at: new Date().toISOString() };
  });

  try {
    await supabase
      .from("app_config")
      .upsert(rows as Array<{ key: string; value: Record<string, unknown>; updated_at: string }>, { onConflict: "key" });
  } catch (err) {
    console.warn("[appConfig] Failed to push config:", err);
  }
}
