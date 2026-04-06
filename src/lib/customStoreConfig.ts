// Custom store types and categories, persisted in localStorage + Supabase
import { STORE_TYPES } from "../data/storeTypes";
import { CATEGORIES } from "../data/categories";
import { SEED_CATEGORIES } from "../data/seedCategories";
import { saveConfig } from "./appConfigStore";

const STORE_TYPES_KEY = "babelcart_custom_store_types";
const CATEGORIES_KEY = "babelcart_custom_categories";
const MAPPING_KEY = "babelcart_custom_cat_mapping";

export interface CustomStoreType {
  id: string;
  emoji: string;
  en: string;
  es: string;
  pl: string;
}

export interface CustomCategory {
  id: string;
  emoji: string;
  color: string;
  en: string;
  es: string;
  pl: string;
  storeType: string; // which store type this belongs to
}

// ── Custom store types ──────────────────────────────────

export function getCustomStoreTypes(): CustomStoreType[] {
  try {
    const raw = localStorage.getItem(STORE_TYPES_KEY);
    if (raw) return JSON.parse(raw) as CustomStoreType[];
  } catch { /* ignore */ }
  return [];
}

export function saveCustomStoreTypes(types: CustomStoreType[]) {
  localStorage.setItem(STORE_TYPES_KEY, JSON.stringify(types));
  void saveConfig("custom_store_types", types);
}

export function addCustomStoreType(type: CustomStoreType) {
  const all = getCustomStoreTypes();
  if (!all.find(t => t.id === type.id)) {
    all.push(type);
    saveCustomStoreTypes(all);
  }
}

export function removeCustomStoreType(id: string) {
  saveCustomStoreTypes(getCustomStoreTypes().filter(t => t.id !== id));
}

// ── Custom categories ───────────────────────────────────

export function getCustomCategories(): CustomCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) return JSON.parse(raw) as CustomCategory[];
  } catch { /* ignore */ }
  return [];
}

export function saveCustomCategories(cats: CustomCategory[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  void saveConfig("custom_categories", cats);
}

export function addCustomCategory(cat: CustomCategory) {
  const all = getCustomCategories();
  if (!all.find(c => c.id === cat.id)) {
    all.push(cat);
    saveCustomCategories(all);
  }
}

export function removeCustomCategory(id: string) {
  saveCustomCategories(getCustomCategories().filter(c => c.id !== id));
}

// ── Category → Store Type mapping overrides ─────────────
// Allows moving built-in categories to different store types

function getCategoryStoreTypeOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAPPING_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

// ── Combined helpers ────────────────────────────────────

export interface StoreTypeWithCategories {
  id: string;
  emoji: string;
  en: string;
  es: string;
  pl: string;
  custom: boolean;
  categories: Array<{
    id: string;
    emoji: string;
    color: string;
    en: string;
    es: string;
    pl: string;
    custom: boolean;
  }>;
}

export function getAllStoreTypesWithCategories(): StoreTypeWithCategories[] {
  const builtInTypes = STORE_TYPES.map(t => ({ ...t, custom: false }));
  const customTypes = getCustomStoreTypes().map(t => ({ ...t, custom: true }));
  const allTypes = [...builtInTypes, ...customTypes];

  const overrides = getCategoryStoreTypeOverrides();
  const customCats = getCustomCategories();

  // Build map: storeType -> categories
  const storeToCat: Record<string, Array<{ id: string; emoji: string; color: string; en: string; es: string; pl: string; custom: boolean }>> = {};

  // Map built-in categories using SEED_CATEGORIES mapping
  const seenCats = new Set<string>();
  for (const seed of SEED_CATEGORIES) {
    const catData = CATEGORIES[seed.category];
    if (!catData || seenCats.has(seed.category)) continue;
    seenCats.add(seed.category);
    const storeType = overrides[seed.category] ?? seed.storeType;
    if (!storeToCat[storeType]) storeToCat[storeType] = [];
    storeToCat[storeType].push({
      id: seed.category,
      emoji: catData.emoji,
      color: catData.color,
      en: catData.en,
      es: catData.es,
      pl: catData.pl,
      custom: false,
    });
  }

  // Add "other" to its default store type
  if (CATEGORIES.other && !seenCats.has("other")) {
    const storeType = overrides["other"] ?? "grocery";
    if (!storeToCat[storeType]) storeToCat[storeType] = [];
    storeToCat[storeType].push({
      id: "other",
      emoji: CATEGORIES.other.emoji,
      color: CATEGORIES.other.color,
      en: CATEGORIES.other.en,
      es: CATEGORIES.other.es,
      pl: CATEGORIES.other.pl,
      custom: false,
    });
  }

  // Add custom categories to their store types
  for (const cat of customCats) {
    if (!storeToCat[cat.storeType]) storeToCat[cat.storeType] = [];
    storeToCat[cat.storeType].push({
      id: cat.id,
      emoji: cat.emoji,
      color: cat.color,
      en: cat.en,
      es: cat.es,
      pl: cat.pl,
      custom: true,
    });
  }

  return allTypes.map(t => ({
    ...t,
    categories: storeToCat[t.id] ?? [],
  }));
}
