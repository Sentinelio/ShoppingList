export const CATEGORIES: Record<string, { emoji: string; color: string; en: string; es: string; pl: string }> = {
  // ── Grocery ──
  fruits:       { emoji: "🍎", color: "#4ade80", en: "Fruits",            es: "Frutas",              pl: "Owoce" },
  vegetables:   { emoji: "🥬", color: "#22c55e", en: "Vegetables",        es: "Verduras",            pl: "Warzywa" },
  dairy:        { emoji: "🥛", color: "#60a5fa", en: "Dairy & Eggs",      es: "Lácteos",             pl: "Nabiał" },
  meat:         { emoji: "🥩", color: "#f87171", en: "Meat & Fish",       es: "Carne y Pescado",     pl: "Mięso i Ryby" },
  bakery:       { emoji: "🍞", color: "#d4a04a", en: "Bakery",            es: "Panadería",           pl: "Pieczywo" },
  grains:       { emoji: "🌾", color: "#c4a04a", en: "Grains & Pasta",    es: "Cereales y Pasta",    pl: "Zboża i Makaron" },
  drinks:       { emoji: "🥤", color: "#38bdf8", en: "Drinks",            es: "Bebidas",             pl: "Napoje" },
  snacks:       { emoji: "🍪", color: "#fb923c", en: "Snacks & Sweets",   es: "Snacks",              pl: "Przekąski" },
  condiments:   { emoji: "🧂", color: "#a78bfa", en: "Condiments & Spices", es: "Condimentos",       pl: "Przyprawy" },
  frozen:       { emoji: "🧊", color: "#7dd3fc", en: "Frozen & Canned",   es: "Congelados",          pl: "Mrożonki" },
  household:    { emoji: "🧴", color: "#f472b6", en: "Household",         es: "Hogar",               pl: "Dom" },
  baby:         { emoji: "👶", color: "#f9a8d4", en: "Baby & Hygiene",    es: "Bebé e Higiene",      pl: "Dziecko i Higiena" },
  // ── Drugstore ──
  skincare:     { emoji: "🧴", color: "#e879f9", en: "Skincare",          es: "Cuidado facial",      pl: "Pielęgnacja" },
  haircare:     { emoji: "💇", color: "#c084fc", en: "Haircare",          es: "Cuidado capilar",     pl: "Włosy" },
  bodycare:     { emoji: "🚿", color: "#a78bfa", en: "Body Care",         es: "Cuidado corporal",    pl: "Ciało" },
  oralcare:     { emoji: "🪥", color: "#67e8f9", en: "Oral Care",         es: "Higiene bucal",       pl: "Higiena jamy ustnej" },
  makeup:       { emoji: "💄", color: "#fb7185", en: "Makeup",            es: "Maquillaje",          pl: "Makijaż" },
  cleaning:     { emoji: "🧹", color: "#a3e635", en: "Cleaning",          es: "Limpieza",            pl: "Środki czystości" },
  // ── Pharmacy ──
  medicines:        { emoji: "💊", color: "#f87171", en: "Medicines",         es: "Medicamentos",        pl: "Leki" },
  firstaid:         { emoji: "🩹", color: "#fb923c", en: "First Aid",         es: "Primeros auxilios",   pl: "Pierwsza pomoc" },
  vitamins:         { emoji: "💪", color: "#4ade80", en: "Vitamins",          es: "Vitaminas",           pl: "Witaminy" },
  natural_remedies: { emoji: "🌿", color: "#22c55e", en: "Natural Remedies",  es: "Remedios naturales",  pl: "Naturalne" },
  eye_ear_care:     { emoji: "👁️", color: "#06b6d4", en: "Eye & Ear Care",    es: "Ojos y Oídos",        pl: "Oczy i Uszy" },
  sexual_health:    { emoji: "🩺", color: "#a78bfa", en: "Sexual Health",     es: "Salud sexual",        pl: "Zdrowie intymne" },
  // ── Electronics ──
  phones:       { emoji: "📱", color: "#818cf8", en: "Phones",            es: "Teléfonos",           pl: "Telefony" },
  computers:    { emoji: "💻", color: "#6366f1", en: "Computers",         es: "Ordenadores",         pl: "Komputery" },
  tv_audio:     { emoji: "📺", color: "#8b5cf6", en: "TV & Audio",        es: "TV y Audio",          pl: "TV i Audio" },
  appliances:   { emoji: "🏠", color: "#a78bfa", en: "Home Appliances",   es: "Electrodomésticos",   pl: "AGD" },
  small_elec:   { emoji: "🔋", color: "#c4b5fd", en: "Small Electronics", es: "Pequeña electrónica", pl: "Drobna elektronika" },
  // ── Sports ──
  fitness:      { emoji: "🏃", color: "#34d399", en: "Running & Fitness", es: "Running y Fitness",   pl: "Bieganie i Fitness" },
  outdoor:      { emoji: "⛺", color: "#10b981", en: "Outdoor & Camping", es: "Aire libre",          pl: "Outdoor" },
  water_sports: { emoji: "🏊", color: "#22d3ee", en: "Water Sports",      es: "Deportes acuáticos",  pl: "Sporty wodne" },
  ball_sports:  { emoji: "⚽", color: "#fbbf24", en: "Ball Sports",       es: "Deportes de pelota",  pl: "Sporty piłkowe" },
  cycling:      { emoji: "🚴", color: "#f97316", en: "Cycling",           es: "Ciclismo",            pl: "Kolarstwo" },
  winter:       { emoji: "⛷️", color: "#7dd3fc", en: "Winter Sports",     es: "Deportes de invierno", pl: "Sporty zimowe" },
  // ── Hardware ──
  tools:        { emoji: "🔨", color: "#f59e0b", en: "Hand Tools",        es: "Herramientas",        pl: "Narzędzia" },
  fasteners:    { emoji: "🔩", color: "#d97706", en: "Fasteners",         es: "Fijaciones",          pl: "Śruby i gwoździe" },
  electrical:   { emoji: "⚡", color: "#eab308", en: "Electrical",        es: "Electricidad",        pl: "Elektryka" },
  plumbing:     { emoji: "🚰", color: "#06b6d4", en: "Plumbing",          es: "Fontanería",          pl: "Hydraulika" },
  paint:        { emoji: "🎨", color: "#ec4899", en: "Paint & Deco",      es: "Pintura y Deco",      pl: "Farby i Dekoracje" },
  garden:       { emoji: "🌱", color: "#22c55e", en: "Garden",            es: "Jardín",              pl: "Ogród" },
  building:     { emoji: "🧱", color: "#78716c", en: "Building",          es: "Construcción",        pl: "Budowa" },
  security:     { emoji: "🔒", color: "#64748b", en: "Security & Locks",  es: "Cerrajería",          pl: "Zamki" },
  // ── Furniture ──
  living:       { emoji: "🛋️", color: "#a3a3a3", en: "Living Room",       es: "Salón",               pl: "Salon" },
  bedroom:      { emoji: "🛏️", color: "#a78bfa", en: "Bedroom",           es: "Dormitorio",          pl: "Sypialnia" },
  kitchen_items: { emoji: "🍽️", color: "#f97316", en: "Kitchen Items",    es: "Cocina",              pl: "Kuchnia" },
  bathroom:     { emoji: "🚿", color: "#22d3ee", en: "Bathroom",          es: "Baño",                pl: "Łazienka" },
  office:       { emoji: "🖥️", color: "#6366f1", en: "Office",            es: "Oficina",             pl: "Biuro" },
  // ── Pets ──
  pet_food:         { emoji: "🍖", color: "#f59e0b", en: "Pet Food",              es: "Comida",                pl: "Karma" },
  pet_accessories:  { emoji: "🎾", color: "#fbbf24", en: "Accessories & Toys",    es: "Accesorios y Juguetes", pl: "Akcesoria i Zabawki" },
  pet_hygiene:      { emoji: "🧼", color: "#60a5fa", en: "Hygiene & Grooming",    es: "Higiene y Aseo",        pl: "Higiena" },
  pet_health:       { emoji: "💊", color: "#f87171", en: "Health & Care",         es: "Salud",                 pl: "Zdrowie" },
  pet_habitat:      { emoji: "🏠", color: "#a78bfa", en: "Habitat & Bedding",     es: "Hábitat y Descanso",    pl: "Legowiska i Klatki" },
  // ── Clothing ──
  tops:         { emoji: "👕", color: "#60a5fa", en: "Tops & Outerwear",  es: "Tops y Abrigos",      pl: "Góra i Okrycia" },
  bottoms:      { emoji: "👖", color: "#818cf8", en: "Bottoms",           es: "Pantalones",          pl: "Spodnie" },
  underwear:    { emoji: "🩲", color: "#94a3b8", en: "Underwear & Socks", es: "Ropa interior",       pl: "Bielizna" },
  sleepwear:    { emoji: "😴", color: "#a78bfa", en: "Sleepwear",         es: "Ropa de dormir",      pl: "Piżamy" },
  accessories:  { emoji: "👜", color: "#e879f9", en: "Accessories",       es: "Accesorios",          pl: "Akcesoria" },
  footwear:     { emoji: "👟", color: "#f97316", en: "Footwear",          es: "Calzado",             pl: "Obuwie" },
  bags_luggage: { emoji: "🎒", color: "#6366f1", en: "Bags & Luggage",    es: "Bolsos y Equipaje",   pl: "Torby i Walizki" },
  jewelry:      { emoji: "💍", color: "#fbbf24", en: "Jewelry & Watches", es: "Joyas y Relojes",     pl: "Biżuteria i Zegarki" },
  // ── Auto ──
  car_fluids:   { emoji: "🛢️", color: "#78716c", en: "Car Fluids",        es: "Líquidos de coche",   pl: "Płyny samochodowe" },
  car_parts:    { emoji: "🔧", color: "#a3a3a3", en: "Car Parts",         es: "Recambios",           pl: "Części" },
  car_interior: { emoji: "🚗", color: "#64748b", en: "Car Interior",      es: "Interior del coche",  pl: "Wnętrze auta" },
  car_tools:    { emoji: "🧰", color: "#f59e0b", en: "Car Tools",         es: "Herramientas coche",  pl: "Narzędzia" },
  car_cleaning: { emoji: "🧽", color: "#22d3ee", en: "Car Cleaning",      es: "Limpieza coche",      pl: "Czyszczenie auta" },
  car_tires:    { emoji: "🛞", color: "#475569", en: "Tires & Wheels",    es: "Neumáticos y Llantas", pl: "Opony i Felgi" },
  // ── Stationery ──
  writing:         { emoji: "✏️", color: "#f59e0b", en: "Pens & Pencils",       es: "Bolígrafos y Lápices",   pl: "Długopisy i Ołówki" },
  paper_notebooks: { emoji: "📓", color: "#60a5fa", en: "Paper & Notebooks",    es: "Papel y Cuadernos",      pl: "Papier i Zeszyty" },
  art_supplies:    { emoji: "🎨", color: "#ec4899", en: "Art & Craft",          es: "Arte y Manualidades",    pl: "Artykuły Plastyczne" },
  desk_org:        { emoji: "📎", color: "#94a3b8", en: "Desk & Organization",  es: "Escritorio y Organización", pl: "Biurko i Organizacja" },
  gift_cards:      { emoji: "🎁", color: "#fb7185", en: "Gift Wrap & Cards",    es: "Envoltorio y Tarjetas",  pl: "Opakowania i Kartki" },
  school:          { emoji: "🎒", color: "#22c55e", en: "School Supplies",      es: "Material escolar",       pl: "Szkolne" },
  // ── Bazaar ──
  home_deco:      { emoji: "🕯️", color: "#e879f9", en: "Home Decoration",   es: "Decoración",             pl: "Dekoracje" },
  kitchen_acc:    { emoji: "🍴", color: "#fb923c", en: "Kitchen Acc.",      es: "Accesorios cocina",      pl: "Akcesoria kuchenne" },
  storage_org:    { emoji: "📦", color: "#94a3b8", en: "Storage & Organization", es: "Almacenaje",         pl: "Przechowywanie" },
  party_supplies: { emoji: "🎉", color: "#f472b6", en: "Party Supplies",    es: "Fiesta",                 pl: "Imprezowe" },
  seasonal:       { emoji: "🎄", color: "#22c55e", en: "Seasonal",          es: "Temporada",              pl: "Sezonowe" },
  gifts_novelty:  { emoji: "🎁", color: "#f97316", en: "Gifts & Novelty",   es: "Regalos",                pl: "Prezenty" },
  // ── Fallback ──
  other:        { emoji: "🛒", color: "#8b949e", en: "Other",             es: "Otros",               pl: "Inne" },
};

export const CATEGORY_ORDER = [
  // Grocery
  "fruits", "vegetables", "dairy", "meat", "bakery", "grains", "drinks", "condiments", "snacks", "frozen", "household", "baby",
  // Drugstore
  "skincare", "haircare", "bodycare", "oralcare", "makeup", "cleaning",
  // Pharmacy
  "medicines", "firstaid", "vitamins", "natural_remedies", "eye_ear_care", "sexual_health",
  // Electronics
  "phones", "computers", "tv_audio", "appliances", "small_elec",
  // Sports
  "fitness", "outdoor", "water_sports", "ball_sports", "cycling", "winter",
  // Hardware
  "tools", "fasteners", "electrical", "plumbing", "paint", "garden", "building", "security",
  // Furniture
  "living", "bedroom", "kitchen_items", "bathroom", "office",
  // Pets (generic)
  "pet_food", "pet_accessories", "pet_hygiene", "pet_health", "pet_habitat",
  // Clothing
  "tops", "bottoms", "underwear", "sleepwear", "accessories", "footwear", "bags_luggage", "jewelry",
  // Auto
  "car_fluids", "car_parts", "car_interior", "car_tools", "car_cleaning", "car_tires",
  // Stationery
  "writing", "paper_notebooks", "art_supplies", "desk_org", "gift_cards", "school",
  // Bazaar
  "home_deco", "kitchen_acc", "storage_org", "party_supplies", "seasonal", "gifts_novelty",
  // Fallback
  "other",
];

export function getCategoryName(cat: string, lang: string): string {
  const c = CATEGORIES[cat] ?? CATEGORIES.other;
  return (c as Record<string, string>)[lang] ?? c.en;
}

export function getCategoryEmoji(cat: string): string {
  return CATEGORIES[cat]?.emoji ?? "🛒";
}

export function getCategoryColor(cat: string): string {
  return CATEGORIES[cat]?.color ?? "#8b949e";
}
