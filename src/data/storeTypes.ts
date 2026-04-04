export const STORE_TYPES = [
  { id: "grocery",     emoji: "🛒", en: "Supermarket",    es: "Supermercado",    pl: "Supermarket" },
  { id: "drugstore",   emoji: "💄", en: "Drugstore",      es: "Droguería",       pl: "Drogeria" },
  { id: "pharmacy",    emoji: "💊", en: "Pharmacy",       es: "Farmacia",        pl: "Apteka" },
  { id: "electronics", emoji: "🔌", en: "Electronics",    es: "Electrónica",     pl: "Elektronika" },
  { id: "sports",      emoji: "⚽", en: "Sports",         es: "Deportes",        pl: "Sport" },
  { id: "hardware",    emoji: "🔨", en: "Hardware Store",  es: "Bricolaje",       pl: "Budowlany" },
  { id: "furniture",   emoji: "🛋️", en: "Furniture",      es: "Muebles",         pl: "Meble" },
  { id: "pets",        emoji: "🐶", en: "Pet Shop",       es: "Mascotas",        pl: "Zoologiczny" },
  { id: "clothing",    emoji: "👕", en: "Clothing",       es: "Ropa",            pl: "Odzież" },
  { id: "auto",        emoji: "🚗", en: "Auto Parts",     es: "Recambios",       pl: "Motoryzacja" },
  { id: "stationery",  emoji: "✏️", en: "Stationery",     es: "Papelería",       pl: "Papierniczy" },
  { id: "bazaar",      emoji: "🏠", en: "Bazaar",         es: "Bazar",           pl: "Bazar" },
] as const;

export type StoreTypeId = (typeof STORE_TYPES)[number]["id"];

export function getStoreTypeName(id: string, lang: string): string {
  const st = STORE_TYPES.find(s => s.id === id);
  if (!st) return id;
  return (st as Record<string, string>)[lang] ?? st.en;
}
