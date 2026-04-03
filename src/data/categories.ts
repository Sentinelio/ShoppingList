export const CATEGORIES: Record<string, { emoji: string; color: string; en: string; es: string; pl: string }> = {
  fruits:     { emoji: "🍎", color: "#4ade80", en: "Fruits",          es: "Frutas",              pl: "Owoce" },
  vegetables: { emoji: "🥬", color: "#22c55e", en: "Vegetables",      es: "Verduras",            pl: "Warzywa" },
  dairy:      { emoji: "🥛", color: "#60a5fa", en: "Dairy",           es: "Lácteos",             pl: "Nabiał" },
  meat:       { emoji: "🥩", color: "#f87171", en: "Meat & Fish",     es: "Carne y Pescado",     pl: "Mięso i Ryby" },
  bakery:     { emoji: "🍞", color: "#d4a04a", en: "Bakery",          es: "Panadería",           pl: "Pieczywo" },
  grains:     { emoji: "🌾", color: "#c4a04a", en: "Grains & Pasta",  es: "Cereales y Pasta",    pl: "Zboża i Makaron" },
  drinks:     { emoji: "🥤", color: "#38bdf8", en: "Drinks",          es: "Bebidas",             pl: "Napoje" },
  snacks:     { emoji: "🍪", color: "#fb923c", en: "Snacks",          es: "Snacks",              pl: "Przekąski" },
  condiments: { emoji: "🧂", color: "#a78bfa", en: "Condiments",      es: "Condimentos",         pl: "Przyprawy" },
  frozen:     { emoji: "🧊", color: "#7dd3fc", en: "Frozen",          es: "Congelados",          pl: "Mrożonki" },
  household:  { emoji: "🧴", color: "#f472b6", en: "Household",       es: "Hogar",               pl: "Dom" },
  other:      { emoji: "🛒", color: "#8b949e", en: "Other",           es: "Otros",               pl: "Inne" },
};

export const CATEGORY_ORDER = [
  "fruits", "vegetables", "dairy", "meat", "bakery", "grains",
  "drinks", "condiments", "snacks", "frozen", "household", "other",
];

export function getCategoryName(cat: string, lang: string): string {
  const c = CATEGORIES[cat] ?? CATEGORIES.other;
  return (c as Record<string, string>)[lang] ?? c.en;
}

export function getCategoryEmoji(cat: string): string {
  return CATEGORIES[cat]?.emoji ?? "🛒";
}
