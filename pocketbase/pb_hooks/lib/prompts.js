// BabelCart prompts — copied VERBATIM from the old Supabase Edge Functions
// (legacy/supabase/functions/*). They are tuned; do not reword them.
// Only the surrounding JS changed (function wrappers instead of Deno code).

// translate — all categories across 27 store types. Keep in sync with src/data/categories.ts
const CATEGORIES_LIST = [
  // Supermarket (grocery) — dry/shelf goods only; meat → butcher, fish → fishmonger, bread → bakery
  "fruits (apples, bananas, berries, dried fruits, nuts)",
  "vegetables (leafy greens, root veg, mushrooms, salad items)",
  "dairy (milk, cheese, yogurt, butter, cream, eggs)",
  "grains (rice, pasta, flour, cereal, beans, lentils, oats)",
  "drinks (water, juice, soda, tea, coffee, plant milks — NO alcohol)",
  "snacks (chips, cookies, chocolate, candy, bars)",
  "condiments (sauces, oils, vinegar, spices, herbs, dressings)",
  "frozen (frozen meals, ice cream, canned beans, canned fish)",
  "household (cleaning: detergent, sponges, trash bags, foil)",
  "baby (diapers, wipes, baby food, toilet paper, tissues)",
  // Drugstore
  "skincare (face cream, body lotion, sunscreen, serum, masks)",
  "haircare (shampoo, conditioner, dye, gel, hairspray)",
  "bodycare (shower gel, soap, deodorant, razor, shaving cream)",
  "oralcare (toothpaste, toothbrush, mouthwash, floss)",
  "makeup (foundation, mascara, lipstick, nail polish, blush)",
  "cleaning (laundry detergent, fabric softener, floor cleaner, disinfectant)",
  // Pharmacy
  "medicines (ibuprofen, paracetamol, cough syrup, antacid)",
  "firstaid (bandages, plasters, thermometer, antiseptic)",
  "vitamins (vitamin C, D, iron, magnesium, omega-3, multivitamin)",
  "natural_remedies (herbal tea, echinacea, propolis, aloe vera, arnica)",
  "eye_ear_care (eye drops, contact lens solution, ear drops, eye wash)",
  "sexual_health (condoms, lubricant, pregnancy test, ovulation test)",
  // Bakery (dedicated shop)
  "breads (white bread, baguette, sourdough, rye, brioche, rolls)",
  "pastries (croissant, pain au chocolat, danish, muffin, donut, eclair)",
  "cakes (birthday cake, cheesecake, tiramisu, cupcake, brownie, macaron)",
  "sandwiches (ham sandwich, panini, wrap, bocadillo, baguette sandwich)",
  // Butcher
  "beef_pork (beef steak, ribeye, ground beef, pork chop, bacon raw, lamb)",
  "poultry (whole chicken, chicken breast, chicken thigh, turkey, duck, quail)",
  "cold_cuts (ham, salami, chorizo, prosciutto, sausage, mortadella, bacon)",
  // Fishmonger
  "fish_fresh (salmon, tuna, cod, sea bass, hake, sardine, mackerel, trout)",
  "shellfish (shrimp, prawn, lobster, crab, mussels, clams, oysters, squid, octopus)",
  "smoked_cured_fish (smoked salmon, smoked mackerel, anchovies, salt cod, caviar)",
  // Liquor
  "wine (red, white, rosé, sparkling, champagne, prosecco, cava)",
  "beer (lager, pilsner, IPA, stout, ale, craft beer, cider)",
  "spirits (vodka, whisky, rum, gin, tequila, brandy, cognac, liqueur)",
  "mixers (tonic, soda water, cola, ginger beer, bitters, syrup)",
  // Electronics
  "phones (smartphone, phone case, charger, cable, earbuds)",
  "computers (laptop, monitor, mouse, keyboard, USB drive, printer)",
  "tv_audio (television, soundbar, speaker, headphones, HDMI cable)",
  "appliances (vacuum, microwave, fridge, washer, blender, kettle, toaster, iron)",
  "small_elec (batteries, light bulb, extension cord, flashlight, power strip)",
  // Sports
  "fitness (running shoes, leggings, yoga mat, dumbbells, fitness tracker)",
  "outdoor (tent, sleeping bag, backpack, hiking boots, camping stove)",
  "water_sports (swimsuit, goggles, snorkel, wetsuit, surfboard)",
  "ball_sports (football, basketball, tennis racket, cleats, shin guards)",
  "cycling (bicycle, helmet, lock, pump, cycling shorts, repair kit)",
  "winter (ski, snowboard, snow goggles, ski jacket, thermal underwear)",
  // Hardware
  "tools (hammer, screwdriver, pliers, wrench, drill, saw, tape measure)",
  "fasteners (screws, nails, bolts, glue, silicone, tape, cable ties)",
  "electrical (switch, socket, cable, LED bulb, fuse, circuit breaker)",
  "plumbing (pipe, faucet, valve, shower head, drain, siphon)",
  "paint (paint, brush, roller, primer, varnish, wallpaper, masking tape)",
  "garden (plant pot, soil, fertilizer, hose, lawnmower, pruning shears)",
  "building (cement, plaster, brick, tile, insulation, drywall)",
  "security (lock, padlock, key, door handle, alarm, peephole)",
  // Garden Center
  "plants_outdoor (rose bush, lavender, hydrangea, olive tree, fern, conifer)",
  "seeds_bulbs (tomato seeds, flower seeds, tulip bulbs, grass seed)",
  "pots_planters (terracotta pot, ceramic pot, window box, hanging basket)",
  "garden_care (potting soil, compost, fertilizer, mulch, pesticide, weed killer)",
  // Furniture
  "living (sofa, armchair, coffee table, bookshelf, TV stand, rug, curtain)",
  "bedroom (bed, mattress, pillow, duvet, wardrobe, nightstand)",
  "kitchen_items (plate, bowl, glass, mug, cutlery, pan, pot, cutting board)",
  "bathroom (towel, bath mat, shower curtain, toilet brush, laundry basket)",
  "office (desk, office chair, drawer unit, whiteboard, file organizer)",
  // Pets (generic categories, not by animal type)
  "pet_food (dry dog food, wet cat food, bird seed, fish food, rabbit pellets, hay)",
  "pet_accessories (leash, collar, harness, bowl, chew toy, scratching post, pet carrier)",
  "pet_hygiene (pet shampoo, pet wipes, brush, nail clipper, cat litter, litter box)",
  "pet_health (flea treatment, dewormer, pet vitamins, first aid, calming spray)",
  "pet_habitat (dog bed, cat bed, crate, bird cage, aquarium, hamster wheel, cat tree)",
  // Clothing
  "tops (t-shirt, shirt, sweater, hoodie, jacket, coat, polo)",
  "bottoms (pants, jeans, shorts, skirt, dress, leggings, chinos)",
  "underwear (boxers, briefs, bra, panties, socks, tights, thermal)",
  "sleepwear (pyjamas, nightgown, robe, slippers, lounge pants)",
  "accessories (belt, scarf, hat, gloves, tie, wallet, umbrella — NO sunglasses)",
  "footwear (shoes, boots, sandals, sneakers, slippers, heels)",
  "bags_luggage (handbag, backpack, suitcase, duffel bag, laptop bag, clutch)",
  "jewelry (necklace, bracelet, ring, earrings, watch, pendant, cufflinks)",
  // Baby Shop
  "baby_clothes (onesie, bodysuit, romper, baby socks, bib, sleep sack)",
  "baby_gear (stroller, baby carrier, car seat, high chair, crib, changing table)",
  "baby_feeding (baby bottle, bottle warmer, sterilizer, pacifier, formula, breast pump)",
  "baby_safety (baby monitor, outlet covers, cabinet locks, stair gate)",
  // Toys
  "baby_toys (rattle, soft toy, stacking rings, shape sorter, teething toy, bath toy)",
  "kids_toys (toy car, RC car, action figure, play dough, toy kitchen, kite)",
  "construction_toys (building blocks, LEGO, magnetic tiles, marble run, train set)",
  "dolls_figures (baby doll, fashion doll, doll house, superhero figure, collectible)",
  "board_games (chess, monopoly, scrabble, card game, jigsaw puzzle, party game)",
  "outdoor_toys (scooter, skateboard, trampoline, frisbee, pool toys, jump rope)",
  // Bookstore
  "books (novel, biography, cookbook, travel guide, children's book, textbook)",
  "magazines_comics (fashion magazine, comic book, manga, graphic novel)",
  // Florist
  "cut_flowers (roses, tulips, lilies, sunflowers, orchids, peonies)",
  "houseplants (monstera, pothos, snake plant, cactus, succulent, orchid)",
  "flower_arrangements (bridal bouquet, centerpiece, wreath, floral gift basket)",
  // Optician
  "eyeglasses (prescription glasses, reading glasses, frames, blue-light glasses)",
  "contact_lenses (daily contacts, monthly, colored, toric, multifocal)",
  "lens_care (contact lens solution, rewetting drops, lens wipes)",
  "sunglasses_opt (polarized sunglasses, aviators, wayfarers, sport sunglasses)",
  // Auto Parts
  "car_fluids (engine oil, coolant, brake fluid, antifreeze, washer fluid)",
  "car_parts (wiper blade, air filter, brake pad, spark plug, battery, belt)",
  "car_interior (phone mount, air freshener, seat cover, floor mat, GPS)",
  "car_tools (jack, lug wrench, tire gauge, jumper cables, OBD2 scanner)",
  "car_cleaning (car shampoo, car wax, tire shine, microfiber cloth, detailing brush)",
  "car_tires (summer tire, winter tire, snow chains, wheel nut, hubcap)",
  // Stationery
  "writing (ballpoint pen, gel pen, fountain pen, pencil, marker, highlighter)",
  "paper_notebooks (notebook, spiral notebook, sticky notes, sketchbook, journal)",
  "art_supplies (watercolor, acrylic paint, brushes, canvas, crayons, pastels)",
  "desk_org (stapler, paper clips, tape dispenser, scissors, hole punch, binder)",
  "gift_cards (wrapping paper, gift bag, ribbon, greeting card, envelope)",
  "school (backpack, pencil case, calculator, glue stick, lunch box)",
  // Bazaar
  "home_deco (candle, picture frame, vase, fairy lights, cushion cover, wall clock)",
  "kitchen_acc (sponge, dish rack, food container, thermos, peeler, whisk)",
  "storage_org (storage box, basket, plastic bin, shoe organizer, drawer divider)",
  "party_supplies (balloons, birthday candles, paper plates, party hats, confetti)",
  "seasonal (Christmas ornaments, Halloween decorations, Easter eggs, advent calendar)",
  "gifts_novelty (keychain, mug, magnet, snow globe, souvenir, funny gift)",
  // Kiosk
  "newspapers (daily newspaper, local, national, sports, weekend edition)",
  "magazines (news magazine, gossip, TV guide, car, sports, hobby)",
  "tobacco (cigarettes, rolling tobacco, cigars, lighter, matches, e-cigarette)",
  "lottery (lottery ticket, scratch card, bus ticket, phone card, stamp)",
  // Game Store
  "video_games (PS5 game, Xbox game, Nintendo Switch game, PC game, controller)",
  "card_games (Magic booster, Pokemon TCG, Yu-Gi-Oh, playing cards, card sleeves)",
  "tabletop_games (D&D handbook, RPG dice, miniatures, paint set, battle mat)",
  "puzzles (1000 piece jigsaw, 3D puzzle, wooden puzzle, escape room puzzle)",
  "gaming_gear (gaming headset, gaming mouse, gaming keyboard, gaming chair)",
  // Hunting & Fishing
  "fishing_gear (fishing rod, reel, line, tackle box, net, float, fish finder)",
  "hunting_gear (hunting bow, crossbow, arrows, decoy, hunting knife)",
  "outdoor_apparel (waders, rubber boots, camo jacket, thermal gloves, rain suit)",
  "optics_nav (binoculars, rifle scope, rangefinder, GPS device, compass, headlamp)",
  "bait_tackle (lures, spinners, hooks, sinkers, swivels, live bait)",
  // Musical Instruments
  "string_instruments (guitar, bass, violin, cello, ukulele, guitar strings)",
  "wind_instruments (flute, clarinet, saxophone, trumpet, recorder, harmonica)",
  "percussion (drum kit, snare, cymbal, drumsticks, bongo, djembe)",
  "keyboards_piano (digital piano, MIDI keyboard, synthesizer, sustain pedal)",
  "music_accessories (metronome, tuner, music stand, sheet music, cable, pick)",
  // Fabric & Sewing
  "fabrics (cotton, linen, wool, silk, denim, felt, fleece, lace)",
  "yarn_knitting (wool yarn, cotton yarn, knitting needles, crochet hook)",
  "sewing_tools (sewing machine, scissors, measuring tape, seam ripper, pincushion)",
  "notions (buttons, zippers, snaps, elastic, ribbon, thread, needles)",
  "other",
]

// parse-receipt — category keys only (the prompt is already long)
const CATEGORY_KEYS = [
  "fruits","vegetables","dairy","grains","drinks","snacks","condiments","frozen","household","baby",
  "skincare","haircare","bodycare","oralcare","makeup","cleaning",
  "medicines","firstaid","vitamins","natural_remedies","eye_ear_care","sexual_health",
  "breads","pastries","cakes","sandwiches",
  "beef_pork","poultry","cold_cuts",
  "fish_fresh","shellfish","smoked_cured_fish",
  "wine","beer","spirits","mixers",
  "phones","computers","tv_audio","appliances","small_elec",
  "fitness","outdoor","water_sports","ball_sports","cycling","winter",
  "tools","fasteners","electrical","plumbing","paint","garden","building","security",
  "plants_outdoor","seeds_bulbs","pots_planters","garden_care",
  "living","bedroom","kitchen_items","bathroom","office",
  "pet_food","pet_accessories","pet_hygiene","pet_health","pet_habitat",
  "tops","bottoms","underwear","sleepwear","accessories","footwear","bags_luggage","jewelry",
  "baby_clothes","baby_gear","baby_feeding","baby_safety",
  "baby_toys","kids_toys","construction_toys","dolls_figures","board_games","outdoor_toys",
  "books","magazines_comics",
  "cut_flowers","houseplants","flower_arrangements",
  "eyeglasses","contact_lenses","lens_care","sunglasses_opt",
  "car_fluids","car_parts","car_interior","car_tools","car_cleaning","car_tires",
  "writing","paper_notebooks","art_supplies","desk_org","gift_cards","school",
  "home_deco","kitchen_acc","storage_org","party_supplies","seasonal","gifts_novelty",
  "newspapers","magazines","tobacco","lottery",
  "video_games","card_games","tabletop_games","puzzles","gaming_gear",
  "fishing_gear","hunting_gear","outdoor_apparel","optics_nav","bait_tackle",
  "string_instruments","wind_instruments","percussion","keyboards_piano","music_accessories",
  "fabrics","yarn_knitting","sewing_tools","notions",
  "other",
]

function translatePrompt(text, langs) {
  return `You are a shopping list assistant. A user wants to buy: "${text}"

1. Fix typos/misspellings. If it's a description, identify the product.
2. Decide if it is a BRAND / trademarked product (e.g. Coca-Cola, Nutella, Kleenex, Oreo, Pringles, Kinder, Danone, Heinz, Post-it, Red Bull, Doritos, Lay's). A brand is a proper noun that refers to a specific commercial product and should NOT be translated. Generic descriptions ("cola", "chocolate spread", "tissues") are NOT brands.
3. If it IS a brand:
   - Fix only the capitalization/spacing to the canonical form (e.g. "coca cola" → "Coca-Cola", "nutella" → "Nutella").
   - Return the SAME exact canonical string in every language.
   - Add "b": true to the JSON.
4. If it is NOT a brand:
   - Translate into ALL these languages using natural shopping-list terms: ${langs.join(", ")}
   - Omit the "b" field (or set to false).
5. Assign the MOST SPECIFIC store category from this list. Only return the key (e.g. "tools", not "tools (hammer, ...)"). If unsure, pick the closest match. Do not default to "household" or "other" unless truly nothing fits.

Categories (key — examples):
${CATEGORIES_LIST.join("\n")}

Return ONLY JSON, no markdown: {"t":{"en":"...","es":"...", ...},"c":"category_key","b":true|false}`
}

function translateUiPrompt(strings, targetLang, targetLangName) {
  return `Translate ALL these UI strings from English to ${targetLangName} (${targetLang}).
Keep the SAME keys, only translate the values. Use natural, casual language appropriate for a mobile shopping app.

Input:
${JSON.stringify(strings, null, 2)}

Return ONLY the JSON object with translated values, no markdown, no backticks, no explanation.`
}

function receiptPrompt(targetLangs) {
  const langList = targetLangs.join(", ")
  return `You are a receipt (paragon/ticket/factura) parser. You will be given a photo of a shopping receipt.

Extract ALL line items and metadata into strict JSON. The receipt may be in any language (Polish, Spanish, English, etc.) and any currency.

RULES:
1. "store": brand/chain name only (e.g. "Biedronka", "Lidl", "Mercadona", "Carrefour").
2. "store_address": full street address on the receipt header if visible, else null.
3. "nip" / tax_id: the seller's tax number if present, else null.
4. "date": ISO-8601 datetime when printed. If only date, append "T00:00:00". If neither, null.
5. "currency": 3-letter ISO code ("PLN", "EUR", "USD").
6. "total": numeric final amount paid. Use dot decimal separator.

7. "lines": array of purchased products. For each product line:
   - "raw_name": the exact text on the receipt, as-is

   - "expanded_name": product name in the receipt's own language. Follow TWO rules:
       (a) REMOVE the brand (it has its own field).
       (b) REMOVE packaging size that represents the container — weight or volume: "500g", "1L", "250ml", "450g", "800g". These belong in qty + unit.
       (c) KEEP product-differentiating attributes — variant, grade, size letter, count-per-pack, type. These are part of the identity of the product, not packaging:
            · egg grades (M, L, XL, S), "10szt" or "10 jaj" (10 eggs in a carton is the product spec),
            · "pełnoziarnisty", "bez laktozy", "light", "zero", "bio", "eko",
            · colour ("czerwony", "żółty"), cut ("plastry", "kostka"),
            · sub-category ("penne", "spaghetti", "basmati"),
            · fat % ("3,2%", "0%"), strength ("mocne", "delikatne").
       Examples:
            · "Olej Kujawski 1L"          → "Olej rzepakowy"
            · "MlNeNanOptPl2 800G"        → "Mleko modyfikowane dla niemowląt"
            · "Jaja M Wyb M10szt"         → "Jaja M 10szt"
            · "Jaja Scios Ny2s"           → "Jaja Ny 2szt"
            · "JajkoNiespodziLe20g"       → "Jajko-niespodzianka"
            · "Margaryna Rama 450g"       → "Margaryna"
            · "MakPełnoPenPas500g"        → "Makaron pełnoziarnisty penne"

   - "translations": GENERIC product name per language. Same rules (a)(b)(c). Languages: ${langList}. Natural shopping-list wording. Spanish examples: "aceite de colza", "huevos M 10 uds", "margarina", "macarrones integrales penne".

   - "category": the most specific key from this list: ${CATEGORY_KEYS.join(", ")}. Do NOT default to "household" or "other" unless truly nothing fits.

   - "brand": full brand name. AGGRESSIVELY expand receipt abbreviations into the real brand:
       · "Wyb"         → "Wybrzeże"
       · "Scios" / "Ściot" → "Ściot"
       · "dr Diamant" / "drDiamant" → "Diamant"
       · "Kuj"         → "Kujawski"
       · "NeNan"       → "Nestlé NAN"
       · "MlczDol"     → "Mleczna Dolina"
       · "QueenBiat"   → "Queen Białczyk"
       · "Bakalia"     → "Bakalland"
       · "MaoamBerrie" → "Maoam"
       · "ChupaXXL"    → "Chupa Chups"
       · "PaRka"       → "Pasterska Rama" (uncertain — set null if unsure)
       Only null if the name is clearly a generic (e.g. "Jabłko pol czerwone", "Cebula żółta luz", "Ziemniaki wczesne"). For unrecognised abbreviations set null rather than guessing wildly.

   - "qty": numeric quantity purchased. "1,526 x5,99" → 1.526 (kg weighed). "3 x7,99" → 3. "1 x9,99" → 1 (one package).
   - "unit": "kg" if qty is from weighing, "pcs" otherwise, or "l"/"ml" if clearly stated.
   - "unit_price": price per unit. Dot decimal.
   - "total_price": line total after any OPUST/discount subtraction. Dot decimal.
   - "discount": absolute discount amount for this line (OPUST -1,90 → 1.90). 0 if none.
   - "tax_category": single letter (A/B/C/F/X) if shown, else null.
   - "confidence": "high" if text is clear, "low" if partially illegible.

8. IGNORE these lines: OPUSTY ŁĄCZNIE, SPRZEDAŻ OPODATKOWANA, PTU, SUMA PTU, ROZLICZENIE PŁATNOŚCI, card/payment details, barcodes, footer promos, NIP lines, store address lines.

9. An OPUST/discount immediately below a product belongs to the product ABOVE. Merge into that line's discount and adjust total_price.

10. If the photo is NOT a receipt, return: {"error":"not_a_receipt"}

Return ONLY the JSON object, no markdown fences, no commentary.`
}

const SEED_DEFAULT_LANGS = ["en", "es", "pl", "de", "fr", "it", "pt"]

// `langs`: language codes to fill (the admin's enabled languages; "en" is
// always included because it is the dictionary key).
function seedLangs(langs) {
  return ["en"].concat((langs && langs.length ? langs : SEED_DEFAULT_LANGS).filter((c) => c !== "en"))
}

function seedPrompt(count, catPrompt, isBrandsMode, langs) {
  const codes = seedLangs(langs)
  const n = codes.length
  const brandExample = (name) => "{" + codes.map((c) => `"${c}":"${name}"`).join(",") + "}"
  return isBrandsMode
    ? `You are building a brand-name dictionary for a shopping list app. Generate a list of ${count} popular BRAND / trademarked products sold in the "${catPrompt}" section of a store. Mix international brands (Coca-Cola, Nutella, Heinz…) with popular regional ones from the countries where these languages are spoken: ${codes.join(", ")}.

For EACH brand, return the SAME canonical name in all languages (brand names don't translate). Preserve the trademark's official spelling (capitalization, hyphens, accents).

Return ONLY a JSON array, no markdown, no backticks:
[${brandExample("Coca-Cola")},${brandExample("Nutella")},...]

Rules:
- Only real brands, no generic descriptions
- Same exact string for all ${n} languages
- ${count} distinct brands, no duplicates
- All ${n} languages required per entry`
    : `You are a product translation dictionary builder. Generate a list of ${count} common ${catPrompt} that people buy regularly.

For EACH product, provide translations in these languages (ISO 639-1 codes): ${codes.join(", ")}

Return ONLY a JSON array, no markdown, no backticks, one object per product with exactly these keys: ${codes.join(", ")}
Example: [{"en":"milk","es":"leche","pl":"mleko","de":"Milch"},...]

Rules:
- Use the most common/generic name (not brand names), as written on shop shelves in each language
- Use singular forms
- ${count} products, no duplicates
- Every product MUST have all ${n} languages`
}

module.exports = { CATEGORIES_LIST, CATEGORY_KEYS, translatePrompt, translateUiPrompt, receiptPrompt, seedPrompt, seedLangs }
