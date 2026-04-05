export interface DictEntry {
  en: string;
  es?: string;
  pl?: string;
  de?: string;
  fr?: string;
  it?: string;
  pt?: string;
  cat: string;
}

export const LOCAL_DICTIONARY: DictEntry[] = [
  // ── Dairy ──────────────────────────────────────────────
  { en: "milk",          es: "leche",            pl: "mleko",            de: "Milch",            fr: "lait",             it: "latte",            pt: "leite",            cat: "dairy" },
  { en: "whole milk",    es: "leche entera",     pl: "mleko pełne",     de: "Vollmilch",        fr: "lait entier",      it: "latte intero",     pt: "leite integral",   cat: "dairy" },
  { en: "skimmed milk",  es: "leche desnatada",  pl: "mleko odtłuszczone", de: "Magermilch",    fr: "lait écrémé",     it: "latte scremato",   pt: "leite desnatado",  cat: "dairy" },
  { en: "butter",        es: "mantequilla",      pl: "masło",           de: "Butter",           fr: "beurre",           it: "burro",            pt: "manteiga",         cat: "dairy" },
  { en: "cheese",        es: "queso",            pl: "ser",             de: "Käse",             fr: "fromage",          it: "formaggio",        pt: "queijo",           cat: "dairy" },
  { en: "yogurt",        es: "yogur",            pl: "jogurt",          de: "Joghurt",          fr: "yaourt",           it: "yogurt",           pt: "iogurte",          cat: "dairy" },
  { en: "cream",         es: "nata",             pl: "śmietana",        de: "Sahne",            fr: "crème",            it: "panna",            pt: "creme",            cat: "dairy" },
  { en: "cream cheese",  es: "queso crema",      pl: "serek kremowy",   de: "Frischkäse",       fr: "fromage frais",    it: "formaggio cremoso", pt: "cream cheese",   cat: "dairy" },
  { en: "eggs",          es: "huevos",           pl: "jajka",           de: "Eier",             fr: "œufs",             it: "uova",             pt: "ovos",             cat: "dairy" },

  // ── Butcher: Poultry ──────────────────────────────────
  { en: "chicken",        es: "pollo",            pl: "kurczak",         de: "Hähnchen",         fr: "poulet",           it: "pollo",            pt: "frango",           cat: "poultry" },
  { en: "chicken breast", es: "pechuga de pollo", pl: "pierś kurczaka",  de: "Hähnchenbrust",    fr: "blanc de poulet",  it: "petto di pollo",   pt: "peito de frango",  cat: "poultry" },
  { en: "turkey",         es: "pavo",             pl: "indyk",           de: "Truthahn",         fr: "dinde",            it: "tacchino",         pt: "peru",             cat: "poultry" },

  // ── Butcher: Beef & Pork ──────────────────────────────
  { en: "beef",           es: "carne de res",     pl: "wołowina",        de: "Rindfleisch",      fr: "bœuf",             it: "manzo",            pt: "carne bovina",     cat: "beef_pork" },
  { en: "pork",           es: "cerdo",            pl: "wieprzowina",     de: "Schweinefleisch",  fr: "porc",             it: "maiale",           pt: "porco",            cat: "beef_pork" },
  { en: "ground beef",    es: "carne molida",     pl: "mielona wołowa",  de: "Hackfleisch",      fr: "viande hachée",    it: "carne macinata",   pt: "carne moída",      cat: "beef_pork" },

  // ── Butcher: Cold Cuts & Sausages ─────────────────────
  { en: "ham",            es: "jamón",            pl: "szynka",          de: "Schinken",         fr: "jambon",           it: "prosciutto",       pt: "presunto",         cat: "cold_cuts" },
  { en: "bacon",          es: "tocino",           pl: "boczek",          de: "Speck",            fr: "bacon",            it: "pancetta",         pt: "bacon",            cat: "cold_cuts" },
  { en: "sausage",        es: "salchicha",        pl: "kiełbasa",        de: "Wurst",            fr: "saucisse",         it: "salsiccia",        pt: "salsicha",         cat: "cold_cuts" },

  // ── Fishmonger: Fresh Fish ────────────────────────────
  { en: "salmon",         es: "salmón",           pl: "łosoś",           de: "Lachs",            fr: "saumon",           it: "salmone",          pt: "salmão",           cat: "fish_fresh" },
  { en: "tuna",           es: "atún",             pl: "tuńczyk",         de: "Thunfisch",        fr: "thon",             it: "tonno",            pt: "atum",             cat: "fish_fresh" },
  { en: "fish",           es: "pescado",          pl: "ryba",            de: "Fisch",            fr: "poisson",          it: "pesce",            pt: "peixe",            cat: "fish_fresh" },

  // ── Fishmonger: Shellfish ─────────────────────────────
  { en: "shrimp",         es: "camarones",        pl: "krewetki",        de: "Garnelen",         fr: "crevettes",        it: "gamberetti",       pt: "camarão",          cat: "shellfish" },

  // ── Bakery: Breads ────────────────────────────────────
  { en: "bread",          es: "pan",              pl: "chleb",           de: "Brot",             fr: "pain",             it: "pane",             pt: "pão",              cat: "breads" },

  // ── Grains & Pasta ────────────────────────────────────
  { en: "rice",           es: "arroz",            pl: "ryż",             de: "Reis",             fr: "riz",              it: "riso",             pt: "arroz",            cat: "grains" },
  { en: "pasta",          es: "pasta",            pl: "makaron",         de: "Nudeln",           fr: "pâtes",            it: "pasta",            pt: "massa",            cat: "grains" },
  { en: "spaghetti",     es: "espaguetis",       pl: "spaghetti",       de: "Spaghetti",        fr: "spaghetti",        it: "spaghetti",        pt: "espaguete",        cat: "grains" },
  { en: "flour",          es: "harina",           pl: "mąka",            de: "Mehl",             fr: "farine",           it: "farina",           pt: "farinha",          cat: "grains" },
  { en: "oats",           es: "avena",            pl: "owsianka",        de: "Haferflocken",     fr: "flocons d'avoine", it: "avena",            pt: "aveia",            cat: "grains" },
  { en: "cereal",         es: "cereal",           pl: "płatki",          de: "Müsli",            fr: "céréales",         it: "cereali",          pt: "cereal",           cat: "grains" },

  // ── Fruits ─────────────────────────────────────────────
  { en: "apple",          es: "manzana",          pl: "jabłko",          de: "Apfel",            fr: "pomme",            it: "mela",             pt: "maçã",             cat: "fruits" },
  { en: "banana",         es: "plátano",          pl: "banan",           de: "Banane",           fr: "banane",           it: "banana",           pt: "banana",           cat: "fruits" },
  { en: "orange",         es: "naranja",          pl: "pomarańcza",      de: "Orange",           fr: "orange",           it: "arancia",          pt: "laranja",          cat: "fruits" },
  { en: "lemon",          es: "limón",            pl: "cytryna",         de: "Zitrone",          fr: "citron",           it: "limone",           pt: "limão",            cat: "fruits" },
  { en: "strawberry",     es: "fresa",            pl: "truskawka",       de: "Erdbeere",         fr: "fraise",           it: "fragola",          pt: "morango",          cat: "fruits" },
  { en: "grape",          es: "uva",              pl: "winogrono",       de: "Traube",           fr: "raisin",           it: "uva",              pt: "uva",              cat: "fruits" },
  { en: "watermelon",     es: "sandía",           pl: "arbuz",           de: "Wassermelone",     fr: "pastèque",         it: "anguria",          pt: "melancia",         cat: "fruits" },
  { en: "peach",          es: "melocotón",        pl: "brzoskwinia",     de: "Pfirsich",         fr: "pêche",            it: "pesca",            pt: "pêssego",          cat: "fruits" },
  { en: "pear",           es: "pera",             pl: "gruszka",         de: "Birne",            fr: "poire",            it: "pera",             pt: "pera",             cat: "fruits" },
  { en: "pineapple",      es: "piña",             pl: "ananas",          de: "Ananas",           fr: "ananas",           it: "ananas",           pt: "abacaxi",          cat: "fruits" },
  { en: "mango",          es: "mango",            pl: "mango",           de: "Mango",            fr: "mangue",           it: "mango",            pt: "manga",            cat: "fruits" },
  { en: "avocado",        es: "aguacate",         pl: "awokado",         de: "Avocado",          fr: "avocat",           it: "avocado",          pt: "abacate",          cat: "fruits" },
  { en: "kiwi",           es: "kiwi",             pl: "kiwi",            de: "Kiwi",             fr: "kiwi",             it: "kiwi",             pt: "kiwi",             cat: "fruits" },

  // ── Vegetables ─────────────────────────────────────────
  { en: "tomato",         es: "tomate",           pl: "pomidor",         de: "Tomate",           fr: "tomate",           it: "pomodoro",         pt: "tomate",           cat: "vegetables" },
  { en: "potato",         es: "patata",           pl: "ziemniak",        de: "Kartoffel",        fr: "pomme de terre",   it: "patata",           pt: "batata",           cat: "vegetables" },
  { en: "onion",          es: "cebolla",          pl: "cebula",          de: "Zwiebel",          fr: "oignon",           it: "cipolla",          pt: "cebola",           cat: "vegetables" },
  { en: "garlic",         es: "ajo",              pl: "czosnek",         de: "Knoblauch",        fr: "ail",              it: "aglio",            pt: "alho",             cat: "vegetables" },
  { en: "carrot",         es: "zanahoria",        pl: "marchewka",       de: "Karotte",          fr: "carotte",          it: "carota",           pt: "cenoura",          cat: "vegetables" },
  { en: "pepper",         es: "pimiento",         pl: "papryka",         de: "Paprika",          fr: "poivron",          it: "peperone",         pt: "pimentão",         cat: "vegetables" },
  { en: "cucumber",       es: "pepino",           pl: "ogórek",          de: "Gurke",            fr: "concombre",        it: "cetriolo",         pt: "pepino",           cat: "vegetables" },
  { en: "lettuce",        es: "lechuga",          pl: "sałata",          de: "Salat",            fr: "laitue",           it: "lattuga",          pt: "alface",           cat: "vegetables" },
  { en: "spinach",        es: "espinacas",        pl: "szpinak",         de: "Spinat",           fr: "épinards",         it: "spinaci",          pt: "espinafre",        cat: "vegetables" },
  { en: "broccoli",       es: "brócoli",          pl: "brokuły",         de: "Brokkoli",         fr: "brocoli",          it: "broccoli",         pt: "brócolis",         cat: "vegetables" },
  { en: "mushroom",       es: "champiñón",        pl: "grzyb",           de: "Pilz",             fr: "champignon",       it: "fungo",            pt: "cogumelo",         cat: "vegetables" },
  { en: "corn",           es: "maíz",             pl: "kukurydza",       de: "Mais",             fr: "maïs",             it: "mais",             pt: "milho",            cat: "vegetables" },
  { en: "zucchini",       es: "calabacín",        pl: "cukinia",         de: "Zucchini",         fr: "courgette",        it: "zucchina",         pt: "abobrinha",        cat: "vegetables" },
  { en: "eggplant",       es: "berenjena",        pl: "bakłażan",        de: "Aubergine",        fr: "aubergine",        it: "melanzana",        pt: "berinjela",        cat: "vegetables" },
  { en: "cabbage",        es: "col",              pl: "kapusta",         de: "Kohl",             fr: "chou",             it: "cavolo",           pt: "repolho",          cat: "vegetables" },
  { en: "pumpkin",        es: "calabaza",         pl: "dynia",           de: "Kürbis",           fr: "citrouille",       it: "zucca",            pt: "abóbora",          cat: "vegetables" },
  { en: "celery",         es: "apio",             pl: "seler",           de: "Sellerie",         fr: "céleri",           it: "sedano",           pt: "aipo",             cat: "vegetables" },
  { en: "ginger",         es: "jengibre",         pl: "imbir",           de: "Ingwer",           fr: "gingembre",        it: "zenzero",          pt: "gengibre",         cat: "vegetables" },
  { en: "parsley",        es: "perejil",          pl: "pietruszka",      de: "Petersilie",       fr: "persil",           it: "prezzemolo",       pt: "salsa",            cat: "vegetables" },
  { en: "basil",          es: "albahaca",         pl: "bazylia",         de: "Basilikum",        fr: "basilic",          it: "basilico",         pt: "manjericão",       cat: "vegetables" },

  // ── Drinks ─────────────────────────────────────────────
  { en: "coffee",         es: "café",             pl: "kawa",            de: "Kaffee",           fr: "café",             it: "caffè",            pt: "café",             cat: "drinks" },
  { en: "tea",            es: "té",               pl: "herbata",         de: "Tee",              fr: "thé",              it: "tè",               pt: "chá",              cat: "drinks" },
  { en: "water",          es: "agua",             pl: "woda",            de: "Wasser",           fr: "eau",              it: "acqua",            pt: "água",             cat: "drinks" },
  { en: "juice",          es: "zumo",             pl: "sok",             de: "Saft",             fr: "jus",              it: "succo",            pt: "suco",             cat: "drinks" },
  { en: "beer",           es: "cerveza",          pl: "piwo",            de: "Bier",             fr: "bière",            it: "birra",            pt: "cerveja",          cat: "drinks" },
  { en: "wine",           es: "vino",             pl: "wino",            de: "Wein",             fr: "vin",              it: "vino",             pt: "vinho",            cat: "drinks" },
  { en: "coconut milk",   es: "leche de coco",    pl: "mleko kokosowe",  de: "Kokosmilch",       fr: "lait de coco",     it: "latte di cocco",   pt: "leite de coco",    cat: "drinks" },
  { en: "oat milk",       es: "leche de avena",   pl: "mleko owsiane",   de: "Hafermilch",       fr: "lait d'avoine",    it: "latte d'avena",    pt: "leite de aveia",   cat: "drinks" },

  // ── Condiments ─────────────────────────────────────────
  { en: "sugar",          es: "azúcar",           pl: "cukier",          de: "Zucker",           fr: "sucre",            it: "zucchero",         pt: "açúcar",           cat: "condiments" },
  { en: "salt",           es: "sal",              pl: "sól",             de: "Salz",             fr: "sel",              it: "sale",             pt: "sal",              cat: "condiments" },
  { en: "olive oil",      es: "aceite de oliva",  pl: "oliwa z oliwek",  de: "Olivenöl",         fr: "huile d'olive",    it: "olio d'oliva",     pt: "azeite",           cat: "condiments" },
  { en: "oil",            es: "aceite",           pl: "olej",            de: "Öl",               fr: "huile",            it: "olio",             pt: "óleo",             cat: "condiments" },
  { en: "vinegar",        es: "vinagre",          pl: "ocet",            de: "Essig",            fr: "vinaigre",         it: "aceto",            pt: "vinagre",          cat: "condiments" },
  { en: "honey",          es: "miel",             pl: "miód",            de: "Honig",            fr: "miel",             it: "miele",            pt: "mel",              cat: "condiments" },
  { en: "ketchup",        es: "kétchup",          pl: "ketchup",         de: "Ketchup",          fr: "ketchup",          it: "ketchup",          pt: "ketchup",          cat: "condiments" },
  { en: "mustard",        es: "mostaza",          pl: "musztarda",       de: "Senf",             fr: "moutarde",         it: "senape",           pt: "mostarda",         cat: "condiments" },
  { en: "mayonnaise",     es: "mayonesa",         pl: "majonez",         de: "Mayonnaise",       fr: "mayonnaise",       it: "maionese",         pt: "maionese",         cat: "condiments" },
  { en: "soy sauce",      es: "salsa de soja",    pl: "sos sojowy",      de: "Sojasauce",        fr: "sauce soja",       it: "salsa di soia",    pt: "molho de soja",    cat: "condiments" },

  // ── Snacks ─────────────────────────────────────────────
  { en: "chocolate",      es: "chocolate",        pl: "czekolada",       de: "Schokolade",       fr: "chocolat",         it: "cioccolato",       pt: "chocolate",        cat: "snacks" },
  { en: "cookies",        es: "galletas",         pl: "ciastka",         de: "Kekse",            fr: "biscuits",         it: "biscotti",         pt: "biscoitos",        cat: "snacks" },
  { en: "jam",            es: "mermelada",        pl: "dżem",            de: "Marmelade",        fr: "confiture",        it: "marmellata",       pt: "geleia",           cat: "snacks" },
  { en: "peanut butter",  es: "mantequilla de cacahuete", pl: "masło orzechowe", de: "Erdnussbutter", fr: "beurre de cacahuète", it: "burro di arachidi", pt: "manteiga de amendoim", cat: "snacks" },
  { en: "hummus",         es: "hummus",           pl: "hummus",          de: "Hummus",           fr: "houmous",          it: "hummus",           pt: "homus",            cat: "snacks" },

  // ── Frozen ─────────────────────────────────────────────
  { en: "ice cream",      es: "helado",           pl: "lody",            de: "Eiscreme",         fr: "glace",            it: "gelato",           pt: "sorvete",          cat: "frozen" },

  // ── Household ──────────────────────────────────────────
  { en: "soap",           es: "jabón",            pl: "mydło",           de: "Seife",            fr: "savon",            it: "sapone",           pt: "sabão",            cat: "household" },
  { en: "shampoo",        es: "champú",           pl: "szampon",         de: "Shampoo",          fr: "shampooing",       it: "shampoo",          pt: "shampoo",          cat: "household" },
  { en: "toothpaste",     es: "pasta de dientes", pl: "pasta do zębów",  de: "Zahnpasta",        fr: "dentifrice",       it: "dentifricio",      pt: "pasta de dentes",  cat: "household" },
  { en: "toilet paper",   es: "papel higiénico",  pl: "papier toaletowy", de: "Toilettenpapier", fr: "papier toilette",  it: "carta igienica",   pt: "papel higiênico",  cat: "household" },
  { en: "detergent",      es: "detergente",       pl: "detergent",       de: "Waschmittel",      fr: "lessive",          it: "detersivo",        pt: "detergente",       cat: "household" },
  { en: "dish soap",      es: "jabón de platos",  pl: "płyn do naczyń",  de: "Spülmittel",       fr: "liquide vaisselle", it: "detersivo piatti", pt: "detergente de louça", cat: "household" },
  { en: "paper towels",   es: "papel de cocina",  pl: "ręczniki papierowe", de: "Küchenpapier",  fr: "essuie-tout",      it: "carta assorbente", pt: "papel toalha",     cat: "household" },
  { en: "sponge",         es: "esponja",          pl: "gąbka",           de: "Schwamm",          fr: "éponge",           it: "spugna",           pt: "esponja",          cat: "household" },
  { en: "trash bags",     es: "bolsas de basura", pl: "worki na śmieci", de: "Müllbeutel",       fr: "sacs poubelle",    it: "sacchi spazzatura", pt: "sacos de lixo",   cat: "household" },

  // ── Other (baking & specialty) ─────────────────────────
  { en: "baking powder",  es: "levadura en polvo", pl: "proszek do pieczenia", de: "Backpulver", fr: "levure chimique",  it: "lievito in polvere", pt: "fermento em pó", cat: "other" },
  { en: "yeast",          es: "levadura",         pl: "drożdże",         de: "Hefe",             fr: "levure",           it: "lievito",          pt: "fermento",         cat: "other" },
  { en: "cinnamon",       es: "canela",           pl: "cynamon",         de: "Zimt",             fr: "cannelle",         it: "cannella",         pt: "canela",           cat: "other" },
  { en: "vanilla",        es: "vainilla",         pl: "wanilia",         de: "Vanille",          fr: "vanille",          it: "vaniglia",         pt: "baunilha",         cat: "other" },
  { en: "tofu",           es: "tofu",             pl: "tofu",            de: "Tofu",             fr: "tofu",             it: "tofu",             pt: "tofu",             cat: "other" },
];
