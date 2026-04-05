export interface SeedCategory {
  id: string;
  name: string;
  count: number;
  storeType: string;
  category: string;
  prompt: string;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  // Grocery (370)
  { id: "grocery_dairy", name: "Dairy & Eggs", count: 35, storeType: "grocery", category: "dairy", prompt: "dairy products: types of milk, cheese varieties, yogurts, cream, butter types, eggs" },
  { id: "grocery_meat", name: "Meat & Fish", count: 40, storeType: "grocery", category: "meat", prompt: "meats: cuts of beef/pork/chicken/turkey/lamb, cold cuts, sausages, fish, seafood" },
  { id: "grocery_fruits", name: "Fruits", count: 30, storeType: "grocery", category: "fruits", prompt: "fruits including tropical, berries, dried fruits, nuts" },
  { id: "grocery_vegetables", name: "Vegetables", count: 40, storeType: "grocery", category: "vegetables", prompt: "vegetables including leafy greens, root veg, mushrooms, herbs, salad items" },
  { id: "grocery_bakery", name: "Bakery & Grains", count: 35, storeType: "grocery", category: "bakery", prompt: "breads, pastries, cakes, cereals, pasta types, rice types, flour types, grains" },
  { id: "grocery_drinks", name: "Drinks", count: 35, storeType: "grocery", category: "drinks", prompt: "water, juices, sodas, energy drinks, tea types, coffee types, plant milks, beer, wine" },
  { id: "grocery_condiments", name: "Condiments & Spices", count: 40, storeType: "grocery", category: "condiments", prompt: "sauces, oils, vinegars, spices, herbs, dressings, spreads, sweeteners, baking" },
  { id: "grocery_frozen", name: "Frozen & Canned", count: 30, storeType: "grocery", category: "frozen", prompt: "frozen meals, frozen vegetables, ice cream, canned beans, soups, canned fish" },
  { id: "grocery_snacks", name: "Snacks & Sweets", count: 30, storeType: "grocery", category: "snacks", prompt: "chips, crackers, cookies, chocolate, candy, nuts, dried fruit, popcorn, bars" },
  { id: "grocery_household", name: "Household", count: 35, storeType: "grocery", category: "household", prompt: "cleaning: detergent, bleach, dish soap, sponges, trash bags, foil, plastic wrap, paper towels" },
  { id: "grocery_baby", name: "Baby & Hygiene", count: 25, storeType: "grocery", category: "baby", prompt: "diapers, wipes, baby food, baby formula, toilet paper, tissues, cotton pads" },
  // Drugstore (175)
  { id: "drugstore_skin", name: "Skincare", count: 35, storeType: "drugstore", category: "skincare", prompt: "face cream, body lotion, sunscreen, lip balm, micellar water, face masks, serum, toner, exfoliant" },
  { id: "drugstore_hair", name: "Haircare", count: 30, storeType: "drugstore", category: "haircare", prompt: "shampoo types, conditioner, hair mask, hair dye, gel, mousse, hairspray, dry shampoo" },
  { id: "drugstore_body", name: "Body care", count: 30, storeType: "drugstore", category: "bodycare", prompt: "shower gel, soap, deodorant, razor, shaving cream, body scrub, intimate hygiene" },
  { id: "drugstore_oral", name: "Oral care", count: 15, storeType: "drugstore", category: "oralcare", prompt: "toothpaste, toothbrush, mouthwash, dental floss, teeth whitening" },
  { id: "drugstore_makeup", name: "Makeup", count: 35, storeType: "drugstore", category: "makeup", prompt: "foundation, mascara, lipstick, eyeliner, eyeshadow, blush, concealer, powder, nail polish" },
  { id: "drugstore_clean", name: "Cleaning products", count: 30, storeType: "drugstore", category: "cleaning", prompt: "laundry detergent, fabric softener, stain remover, floor cleaner, window cleaner, disinfectant" },
  // Pharmacy (150)
  { id: "pharmacy_meds", name: "Common medicines", count: 30, storeType: "pharmacy", category: "medicines", prompt: "ibuprofen, paracetamol, aspirin, antacid, cough syrup, throat lozenges, nasal spray, antihistamine, laxative, anti-diarrhea" },
  { id: "pharmacy_first", name: "First aid", count: 25, storeType: "pharmacy", category: "firstaid", prompt: "bandages, plasters, gauze, sterile dressing, antiseptic, thermometer, blood pressure monitor, disposable gloves, cold pack, pregnancy test" },
  { id: "pharmacy_vita", name: "Vitamins", count: 25, storeType: "pharmacy", category: "vitamins", prompt: "vitamin C, D, B12, iron, magnesium, zinc, omega-3, multivitamin, probiotics, melatonin, collagen" },
  { id: "pharmacy_natural", name: "Natural remedies", count: 25, storeType: "pharmacy", category: "natural_remedies", prompt: "herbal tea, echinacea, valerian, propolis, royal jelly, aloe vera, tea tree oil, arnica gel, chamomile, ginger supplement" },
  { id: "pharmacy_eye_ear", name: "Eye & ear care", count: 20, storeType: "pharmacy", category: "eye_ear_care", prompt: "eye drops, artificial tears, contact lens solution, ear drops, ear wax remover, eye wash, eye patches" },
  { id: "pharmacy_sexual", name: "Sexual health", count: 20, storeType: "pharmacy", category: "sexual_health", prompt: "condoms, lubricant, pregnancy test, ovulation test, intimate wash, menstrual products" },
  // Electronics (145)
  { id: "electronics_phone", name: "Phones & accessories", count: 25, storeType: "electronics", category: "phones", prompt: "smartphone, phone case, charger, USB cable, screen protector, power bank, earbuds" },
  { id: "electronics_comp", name: "Computers", count: 30, storeType: "electronics", category: "computers", prompt: "laptop, desktop, monitor, mouse, keyboard, webcam, USB drive, external hard drive, printer" },
  { id: "electronics_tv", name: "TV & audio", count: 25, storeType: "electronics", category: "tv_audio", prompt: "television, remote control, soundbar, speaker, headphones, HDMI cable, streaming device" },
  { id: "electronics_home", name: "Home appliances", count: 40, storeType: "electronics", category: "appliances", prompt: "vacuum cleaner, iron, hair dryer, toaster, microwave, oven, refrigerator, washing machine, dishwasher, air conditioner, heater, fan, blender, coffee maker, kettle" },
  { id: "electronics_small", name: "Small electronics", count: 25, storeType: "electronics", category: "small_elec", prompt: "batteries, light bulb, extension cord, power strip, adapter, surge protector, flashlight, timer" },
  // Sports (120)
  { id: "sports_run", name: "Running & fitness", count: 30, storeType: "sports", category: "fitness", prompt: "running shoes, sports bra, leggings, shorts, t-shirt, water bottle, yoga mat, dumbbells, resistance band, jump rope, fitness tracker" },
  { id: "sports_out", name: "Outdoor & camping", count: 30, storeType: "sports", category: "outdoor", prompt: "tent, sleeping bag, backpack, hiking boots, trekking poles, headlamp, compass, camping stove, cooler" },
  { id: "sports_water", name: "Water sports", count: 20, storeType: "sports", category: "water_sports", prompt: "swimsuit, goggles, swim cap, towel, snorkel, fins, inflatable, wetsuit, surfboard" },
  { id: "sports_ball", name: "Ball sports", count: 25, storeType: "sports", category: "ball_sports", prompt: "football, basketball, tennis racket, tennis ball, padel racket, volleyball, goal, shin guards, cleats" },
  { id: "sports_bike", name: "Cycling", count: 20, storeType: "sports", category: "cycling", prompt: "bicycle, helmet, lock, pump, lights, gloves, water bottle holder, cycling shorts, repair kit" },
  { id: "sports_winter", name: "Winter sports", count: 20, storeType: "sports", category: "winter", prompt: "ski, ski boots, ski poles, snowboard, snow goggles, ski jacket, gloves, thermal underwear, ice skates" },
  // Hardware (225)
  { id: "hardware_tools", name: "Hand tools", count: 35, storeType: "hardware", category: "tools", prompt: "hammer, screwdriver, pliers, wrench, saw, tape measure, level, drill, drill bits, sandpaper" },
  { id: "hardware_fix", name: "Fasteners", count: 30, storeType: "hardware", category: "fasteners", prompt: "screws, nails, bolts, nuts, wall plugs, glue, silicone, tape, cable ties, hooks" },
  { id: "hardware_elec", name: "Electrical", count: 30, storeType: "hardware", category: "electrical", prompt: "light switch, socket, plug, cable, wire, fuse, circuit breaker, LED bulb, spotlight, lamp" },
  { id: "hardware_plumb", name: "Plumbing", count: 25, storeType: "hardware", category: "plumbing", prompt: "pipe, tap, faucet, valve, seal, washer, toilet seat, shower head, drain, siphon, water heater" },
  { id: "hardware_paint", name: "Paint & decoration", count: 30, storeType: "hardware", category: "paint", prompt: "paint, brush, roller, primer, varnish, wallpaper, masking tape, paint tray, ladder, drop cloth" },
  { id: "hardware_garden", name: "Garden", count: 30, storeType: "hardware", category: "garden", prompt: "plant pot, soil, fertilizer, seeds, hose, watering can, lawnmower, pruning shears, rake, shovel, wheelbarrow" },
  { id: "hardware_build", name: "Building materials", count: 25, storeType: "hardware", category: "building", prompt: "cement, plaster, brick, tile, grout, insulation, drywall, wood plank, beam, roofing" },
  { id: "hardware_lock", name: "Security & locks", count: 20, storeType: "hardware", category: "security", prompt: "lock, padlock, key, deadbolt, door handle, hinge, chain, alarm, doorbell, peephole" },
  // Furniture (115)
  { id: "furniture_living", name: "Living room", count: 25, storeType: "furniture", category: "living", prompt: "sofa, armchair, coffee table, bookshelf, TV stand, rug, cushion, throw, curtain, lamp" },
  { id: "furniture_bed", name: "Bedroom", count: 25, storeType: "furniture", category: "bedroom", prompt: "bed, mattress, pillow, duvet, bed sheet, wardrobe, nightstand, mirror, hanger, clothes rack" },
  { id: "furniture_kitchen", name: "Kitchen items", count: 25, storeType: "furniture", category: "kitchen_items", prompt: "plate, bowl, glass, mug, cutlery, knife, cutting board, pan, pot, baking tray, container" },
  { id: "furniture_bath", name: "Bathroom", count: 20, storeType: "furniture", category: "bathroom", prompt: "towel, bath mat, shower curtain, soap dispenser, toilet brush, laundry basket, shelf, cabinet" },
  { id: "furniture_office", name: "Office", count: 20, storeType: "furniture", category: "office", prompt: "desk, office chair, lamp, drawer unit, whiteboard, bulletin board, pen holder, file organizer" },
  // Pets (125) — generic categories, not by animal type
  { id: "pets_food", name: "Pet food", count: 30, storeType: "pets", category: "pet_food", prompt: "dry dog food, wet dog food, dog treats, dry cat food, wet cat food, cat treats, bird seed, fish food, rabbit pellets, hamster food, hay, dental chews, puppy food, kitten food" },
  { id: "pets_accessories", name: "Accessories & toys", count: 30, storeType: "pets", category: "pet_accessories", prompt: "leash, collar, harness, dog bowl, cat bowl, chew toy, ball, rope toy, catnip toy, scratching post, cat wand, feather toy, fish net, pet carrier, pet fountain, dog clothes" },
  { id: "pets_hygiene", name: "Hygiene & grooming", count: 25, storeType: "pets", category: "pet_hygiene", prompt: "dog shampoo, cat shampoo, pet wipes, pet brush, nail clipper, toothpaste, toothbrush, cat litter, litter box, deodorizer, ear cleaner, eye wipes, flea comb" },
  { id: "pets_health", name: "Health & care", count: 25, storeType: "pets", category: "pet_health", prompt: "flea treatment, tick collar, deworming, pet vitamins, joint supplement, calming spray, first aid kit, wound spray, pet sunscreen, pet probiotics, hairball remedy" },
  { id: "pets_habitat", name: "Habitat & bedding", count: 25, storeType: "pets", category: "pet_habitat", prompt: "dog bed, cat bed, pet blanket, dog crate, bird cage, hamster cage, aquarium, fish tank filter, aquarium heater, hamster wheel, terrarium, tank decoration, cat tree" },
  // Clothing (160)
  { id: "clothing_tops", name: "Tops & outerwear", count: 25, storeType: "clothing", category: "tops", prompt: "t-shirt, shirt, blouse, sweater, hoodie, jacket, coat, blazer, vest, cardigan, polo, tank top" },
  { id: "clothing_bottom", name: "Bottoms", count: 20, storeType: "clothing", category: "bottoms", prompt: "pants, jeans, shorts, skirt, dress, suit, leggings, tracksuit, overalls, chinos" },
  { id: "clothing_underwear", name: "Underwear & Socks", count: 20, storeType: "clothing", category: "underwear", prompt: "boxers, briefs, bra, sports bra, panties, socks, stockings, tights, thermal underwear, shapewear" },
  { id: "clothing_sleep", name: "Sleepwear", count: 15, storeType: "clothing", category: "sleepwear", prompt: "pyjamas, nightgown, robe, slippers, lounge pants, sleep shirt, onesie" },
  { id: "clothing_access", name: "Accessories", count: 20, storeType: "clothing", category: "accessories", prompt: "belt, scarf, hat, cap, beanie, gloves, tie, bow tie, suspenders, wallet, umbrella, sunglasses, hair accessories" },
  { id: "clothing_shoes", name: "Footwear", count: 20, storeType: "clothing", category: "footwear", prompt: "shoes, boots, sandals, sneakers, slippers, heels, loafers, flip flops, ankle boots, moccasins, espadrilles" },
  { id: "clothing_bags", name: "Bags & Luggage", count: 20, storeType: "clothing", category: "bags_luggage", prompt: "handbag, shoulder bag, tote bag, backpack, suitcase, duffel bag, laptop bag, wallet, clutch, fanny pack, travel bag" },
  { id: "clothing_jewelry", name: "Jewelry & Watches", count: 20, storeType: "clothing", category: "jewelry", prompt: "necklace, bracelet, ring, earrings, watch, pendant, anklet, brooch, cufflinks, chain, charm" },
  // Auto (150)
  { id: "auto_fluid", name: "Car fluids", count: 25, storeType: "auto", category: "car_fluids", prompt: "engine oil, coolant, brake fluid, windshield washer fluid, transmission fluid, power steering fluid, antifreeze, fuel additive" },
  { id: "auto_parts", name: "Car parts", count: 30, storeType: "auto", category: "car_parts", prompt: "wiper blade, air filter, oil filter, cabin filter, brake pad, brake disc, spark plug, battery, fuse, headlight bulb, alternator, belt, hose" },
  { id: "auto_access", name: "Car interior", count: 25, storeType: "auto", category: "car_interior", prompt: "phone mount, air freshener, seat cover, floor mat, trunk organizer, dash cam, GPS, sun shade, steering wheel cover, seat cushion, cup holder" },
  { id: "auto_tools", name: "Car tools", count: 25, storeType: "auto", category: "car_tools", prompt: "jack, lug wrench, tire pressure gauge, jumper cables, tool kit, torque wrench, OBD2 scanner, funnel, creeper, tire inflator, emergency triangle" },
  { id: "auto_cleaning", name: "Car cleaning", count: 25, storeType: "auto", category: "car_cleaning", prompt: "car shampoo, car wax, tire shine, interior cleaner, glass cleaner, leather cleaner, microfiber cloth, wash mitt, bucket, detailing brush, clay bar" },
  { id: "auto_tires", name: "Tires & wheels", count: 20, storeType: "auto", category: "car_tires", prompt: "summer tire, winter tire, all-season tire, snow chains, wheel nut, hubcap, alloy rim, valve cap, tire repair kit, sealant" },
  // Stationery (140)
  { id: "stationery_pens", name: "Pens & pencils", count: 25, storeType: "stationery", category: "writing", prompt: "ballpoint pen, gel pen, fountain pen, marker, highlighter, pencil, mechanical pencil, eraser, sharpener, correction fluid, roller pen" },
  { id: "stationery_paper", name: "Paper & notebooks", count: 25, storeType: "stationery", category: "paper_notebooks", prompt: "notebook, spiral notebook, composition book, legal pad, sticky notes, index cards, loose leaf paper, printer paper, graph paper, sketchbook, journal, planner" },
  { id: "stationery_art", name: "Art & craft", count: 25, storeType: "stationery", category: "art_supplies", prompt: "watercolor paints, acrylic paint, paintbrush, canvas, colored pencils, crayons, markers, modelling clay, origami paper, brush pens, pastels, palette" },
  { id: "stationery_desk", name: "Desk & organization", count: 25, storeType: "stationery", category: "desk_org", prompt: "stapler, staples, paper clips, binder clips, tape dispenser, scissors, ruler, hole punch, file folder, binder, letter tray, desk organizer, paperweight" },
  { id: "stationery_gift", name: "Gift wrap & cards", count: 20, storeType: "stationery", category: "gift_cards", prompt: "wrapping paper, gift bag, tissue paper, ribbon, bow, gift tag, greeting card, birthday card, envelope, gift box, sticker sheet" },
  { id: "stationery_school", name: "School supplies", count: 20, storeType: "stationery", category: "school", prompt: "backpack, pencil case, calculator, geometry set, glue stick, construction paper, lunch box, whiteboard, dividers, exercise book, schoolbag" },
  // Bazaar (135)
  { id: "bazaar_home", name: "Home decoration", count: 25, storeType: "bazaar", category: "home_deco", prompt: "candle, picture frame, vase, artificial flowers, fairy lights, wall clock, cushion cover, throw blanket, doormat, curtain, canvas print" },
  { id: "bazaar_kitchen", name: "Kitchen accessories", count: 25, storeType: "bazaar", category: "kitchen_acc", prompt: "sponge, dish rack, food container, water bottle, thermos, ice cube tray, can opener, peeler, grater, measuring cup, whisk, spatula" },
  { id: "bazaar_storage", name: "Storage & organization", count: 25, storeType: "bazaar", category: "storage_org", prompt: "storage box, basket, plastic bin, shoe organizer, hanging shelf, drawer divider, vacuum bag, toolbox, magazine holder, hook rack" },
  { id: "bazaar_party", name: "Party supplies", count: 20, storeType: "bazaar", category: "party_supplies", prompt: "balloons, birthday candles, paper plates, plastic cups, party hats, banner, confetti, piñata, party favors, disposable cutlery, tablecloth" },
  { id: "bazaar_season", name: "Seasonal", count: 20, storeType: "bazaar", category: "seasonal", prompt: "Christmas tree, Christmas ornaments, string lights, Halloween decorations, pumpkin, Easter eggs, Valentine decorations, advent calendar, nativity, fake snow" },
  { id: "bazaar_gifts", name: "Gifts & novelty", count: 20, storeType: "bazaar", category: "gifts_novelty", prompt: "keychain, mug, magnet, snow globe, photo frame, small plush, jewelry box, music box, souvenir, novelty gadget, funny gift" },
];

export const TOTAL_SEED_PRODUCTS = SEED_CATEGORIES.reduce((a, c) => a + c.count, 0);
