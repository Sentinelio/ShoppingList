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
  // ── Bakery (dedicated) ──
  breads:       { emoji: "🍞", color: "#d4a04a", en: "Breads",             es: "Panes",               pl: "Chleby" },
  pastries:     { emoji: "🥐", color: "#f59e0b", en: "Pastries",           es: "Bollería",            pl: "Ciasta" },
  cakes:        { emoji: "🎂", color: "#ec4899", en: "Cakes & Desserts",   es: "Tartas y Postres",    pl: "Torty i Desery" },
  sandwiches:   { emoji: "🥪", color: "#fb923c", en: "Sandwiches",         es: "Bocadillos",          pl: "Kanapki" },
  // ── Butcher (dedicated) ──
  beef_pork:    { emoji: "🥩", color: "#dc2626", en: "Beef & Pork",        es: "Ternera y Cerdo",     pl: "Wołowina i Wieprzowina" },
  poultry:      { emoji: "🍗", color: "#f59e0b", en: "Poultry",            es: "Aves",                pl: "Drób" },
  cold_cuts:    { emoji: "🍖", color: "#f87171", en: "Cold Cuts & Sausages", es: "Embutidos",         pl: "Wędliny" },
  // ── Fishmonger ──
  fish_fresh:   { emoji: "🐟", color: "#60a5fa", en: "Fresh Fish",         es: "Pescado fresco",      pl: "Świeże ryby" },
  shellfish:    { emoji: "🦐", color: "#fb923c", en: "Shellfish",          es: "Marisco",             pl: "Owoce morza" },
  smoked_cured_fish: { emoji: "🐠", color: "#f472b6", en: "Smoked & Cured", es: "Ahumados",           pl: "Wędzone" },
  // ── Liquor ──
  wine:         { emoji: "🍷", color: "#991b1b", en: "Wine",               es: "Vino",                pl: "Wino" },
  beer:         { emoji: "🍺", color: "#f59e0b", en: "Beer",               es: "Cerveza",             pl: "Piwo" },
  spirits:      { emoji: "🥃", color: "#78350f", en: "Spirits",            es: "Licores",             pl: "Mocne alkohole" },
  mixers:       { emoji: "🥤", color: "#38bdf8", en: "Mixers & Soft",      es: "Refrescos y Mixers",  pl: "Napoje i Mixery" },
  // ── Garden Center ──
  plants_outdoor:  { emoji: "🌳", color: "#16a34a", en: "Plants & Shrubs",  es: "Plantas y Arbustos",  pl: "Rośliny" },
  seeds_bulbs:     { emoji: "🌱", color: "#22c55e", en: "Seeds & Bulbs",    es: "Semillas y Bulbos",   pl: "Nasiona" },
  pots_planters:   { emoji: "🪴", color: "#a3a3a3", en: "Pots & Planters",  es: "Macetas",             pl: "Doniczki" },
  garden_care:     { emoji: "🧴", color: "#84cc16", en: "Soil & Fertilizer", es: "Tierra y Abono",     pl: "Ziemia i Nawozy" },
  // ── Baby Shop ──
  baby_clothes: { emoji: "👶", color: "#f9a8d4", en: "Baby Clothes",       es: "Ropa de bebé",        pl: "Ubranka" },
  baby_gear:    { emoji: "🛒", color: "#a78bfa", en: "Strollers & Gear",   es: "Carritos y Equipo",   pl: "Wózki i Akcesoria" },
  baby_feeding: { emoji: "🍼", color: "#60a5fa", en: "Feeding & Nursing",  es: "Alimentación",        pl: "Karmienie" },
  baby_safety:  { emoji: "🛡️", color: "#f97316", en: "Safety & Monitor",   es: "Seguridad",           pl: "Bezpieczeństwo" },
  // ── Toys ──
  baby_toys:         { emoji: "🧸", color: "#f9a8d4", en: "Baby & Toddler Toys", es: "Juguetes bebé",  pl: "Zabawki dla maluchów" },
  kids_toys:         { emoji: "🪀", color: "#fbbf24", en: "Kids Toys",          es: "Juguetes niños",  pl: "Zabawki dla dzieci" },
  construction_toys: { emoji: "🧱", color: "#ef4444", en: "Construction Toys",  es: "Construcción",    pl: "Klocki i Budowa" },
  dolls_figures:     { emoji: "🪆", color: "#e879f9", en: "Dolls & Figures",    es: "Muñecas y Figuras", pl: "Lalki i Figurki" },
  board_games:       { emoji: "🎲", color: "#6366f1", en: "Board Games & Puzzles", es: "Juegos de mesa", pl: "Gry planszowe" },
  outdoor_toys:      { emoji: "🛴", color: "#22c55e", en: "Outdoor Toys",       es: "Juguetes aire libre", pl: "Zabawki na zewnątrz" },
  // ── Bookstore ──
  books:             { emoji: "📖", color: "#8b5cf6", en: "Books",              es: "Libros",              pl: "Książki" },
  magazines_comics:  { emoji: "📰", color: "#f472b6", en: "Magazines & Comics", es: "Revistas y Cómics",   pl: "Czasopisma i Komiksy" },
  // ── Florist ──
  cut_flowers:         { emoji: "🌹", color: "#ec4899", en: "Cut Flowers",     es: "Flores cortadas",     pl: "Cięte kwiaty" },
  houseplants:         { emoji: "🪴", color: "#16a34a", en: "Houseplants",     es: "Plantas de interior", pl: "Rośliny doniczkowe" },
  flower_arrangements: { emoji: "💐", color: "#f472b6", en: "Arrangements & Gifts", es: "Ramos y Regalos", pl: "Bukiety i Prezenty" },
  // ── Optician ──
  eyeglasses:     { emoji: "👓", color: "#6366f1", en: "Glasses",          es: "Gafas",                pl: "Okulary" },
  contact_lenses: { emoji: "👁️", color: "#06b6d4", en: "Contact Lenses",   es: "Lentillas",            pl: "Soczewki" },
  lens_care:      { emoji: "💧", color: "#38bdf8", en: "Lens Care",        es: "Cuidado de lentes",    pl: "Pielęgnacja soczewek" },
  sunglasses_opt: { emoji: "🕶️", color: "#1e293b", en: "Sunglasses",       es: "Gafas de sol",         pl: "Okulary przeciwsłoneczne" },
  // ── Kiosk ──
  newspapers:   { emoji: "🗞️", color: "#64748b", en: "Newspapers",         es: "Periódicos",          pl: "Gazety" },
  magazines:    { emoji: "📰", color: "#8b5cf6", en: "Magazines",          es: "Revistas",            pl: "Czasopisma" },
  tobacco:      { emoji: "🚬", color: "#78716c", en: "Tobacco",            es: "Tabaco",              pl: "Wyroby tytoniowe" },
  lottery:      { emoji: "🎟️", color: "#fbbf24", en: "Lottery & Tickets",  es: "Lotería y Tickets",   pl: "Loteria" },
  // ── Game Store ──
  video_games:    { emoji: "🎮", color: "#8b5cf6", en: "Video Games",         es: "Videojuegos",           pl: "Gry wideo" },
  card_games:     { emoji: "🃏", color: "#ef4444", en: "Card Games",          es: "Juegos de cartas",      pl: "Gry karciane" },
  tabletop_games: { emoji: "⚔️", color: "#f59e0b", en: "Tabletop & RPG",      es: "Rol y Tabletop",        pl: "RPG i figurki" },
  puzzles:        { emoji: "🧩", color: "#3b82f6", en: "Puzzles",             es: "Puzzles",               pl: "Puzzle" },
  gaming_gear:    { emoji: "🕹️", color: "#06b6d4", en: "Gaming Gear",         es: "Accesorios Gaming",     pl: "Akcesoria dla graczy" },
  // ── Hunting & Fishing ──
  fishing_gear:   { emoji: "🎣", color: "#0ea5e9", en: "Fishing Gear",        es: "Equipo de Pesca",       pl: "Wędkarstwo" },
  hunting_gear:   { emoji: "🏹", color: "#84cc16", en: "Hunting Gear",        es: "Equipo de Caza",        pl: "Łowiectwo" },
  outdoor_apparel: { emoji: "🥾", color: "#78716c", en: "Outdoor Apparel",    es: "Ropa de Caza/Pesca",    pl: "Odzież terenowa" },
  optics_nav:     { emoji: "🔭", color: "#6366f1", en: "Optics & Navigation", es: "Óptica y Navegación",   pl: "Optyka i Nawigacja" },
  bait_tackle:    { emoji: "🪱", color: "#78350f", en: "Bait & Tackle",       es: "Cebos y Aparejos",      pl: "Przynęty" },
  // ── Musical Instruments ──
  string_instruments:   { emoji: "🎻", color: "#d97706", en: "String Instruments", es: "Instrumentos de cuerda", pl: "Instrumenty strunowe" },
  wind_instruments:     { emoji: "🎷", color: "#eab308", en: "Wind Instruments",   es: "Instrumentos de viento", pl: "Instrumenty dęte" },
  percussion:           { emoji: "🥁", color: "#f97316", en: "Percussion",         es: "Percusión",              pl: "Perkusja" },
  keyboards_piano:      { emoji: "🎹", color: "#1e293b", en: "Keyboards & Piano",  es: "Teclados y Piano",       pl: "Klawisze i Pianina" },
  music_accessories:    { emoji: "🎼", color: "#a78bfa", en: "Music Accessories",  es: "Accesorios musicales",   pl: "Akcesoria muzyczne" },
  // ── Fabric & Sewing ──
  fabrics:        { emoji: "🧶", color: "#ec4899", en: "Fabrics",              es: "Telas",                 pl: "Tkaniny" },
  yarn_knitting:  { emoji: "🧵", color: "#f472b6", en: "Yarn & Knitting",      es: "Lanas y Tricot",        pl: "Włóczki" },
  sewing_tools:   { emoji: "✂️", color: "#64748b", en: "Sewing Tools",         es: "Herramientas de Costura", pl: "Narzędzia do szycia" },
  notions:        { emoji: "🪡", color: "#a3a3a3", en: "Buttons & Notions",    es: "Botones y Mercería",    pl: "Guziki i Pasmanteria" },
  // ── Fallback ──
  other:        { emoji: "🛒", color: "#8b949e", en: "Other",              es: "Otros",               pl: "Inne" },
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
  // Bakery (dedicated)
  "breads", "pastries", "cakes", "sandwiches",
  // Butcher
  "beef_pork", "poultry", "cold_cuts",
  // Fishmonger
  "fish_fresh", "shellfish", "smoked_cured_fish",
  // Liquor
  "wine", "beer", "spirits", "mixers",
  // Garden center
  "plants_outdoor", "seeds_bulbs", "pots_planters", "garden_care",
  // Baby shop
  "baby_clothes", "baby_gear", "baby_feeding", "baby_safety",
  // Toys
  "baby_toys", "kids_toys", "construction_toys", "dolls_figures", "board_games", "outdoor_toys",
  // Bookstore
  "books", "magazines_comics",
  // Florist
  "cut_flowers", "houseplants", "flower_arrangements",
  // Optician
  "eyeglasses", "contact_lenses", "lens_care", "sunglasses_opt",
  // Kiosk
  "newspapers", "magazines", "tobacco", "lottery",
  // Game Store
  "video_games", "card_games", "tabletop_games", "puzzles", "gaming_gear",
  // Hunting & Fishing
  "fishing_gear", "hunting_gear", "outdoor_apparel", "optics_nav", "bait_tackle",
  // Musical Instruments
  "string_instruments", "wind_instruments", "percussion", "keyboards_piano", "music_accessories",
  // Fabric & Sewing
  "fabrics", "yarn_knitting", "sewing_tools", "notions",
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
