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
  // Pharmacy (80)
  { id: "pharmacy_meds", name: "Common medicines", count: 30, storeType: "pharmacy", category: "medicines", prompt: "ibuprofen, paracetamol, aspirin, antacid, cough syrup, throat lozenges, nasal spray, eye drops" },
  { id: "pharmacy_first", name: "First aid", count: 25, storeType: "pharmacy", category: "firstaid", prompt: "bandages, plasters, thermometer, blood pressure monitor, pregnancy test, condoms" },
  { id: "pharmacy_vita", name: "Vitamins", count: 25, storeType: "pharmacy", category: "vitamins", prompt: "vitamin C, D, B12, iron, magnesium, omega-3, multivitamin, probiotics, melatonin" },
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
  // Pets (70)
  { id: "pets_dog", name: "Dog", count: 25, storeType: "pets", category: "dog", prompt: "dog food, dog treats, leash, collar, harness, dog bed, chew toy, dog bowl, dog shampoo" },
  { id: "pets_cat", name: "Cat", count: 25, storeType: "pets", category: "cat", prompt: "cat food, cat litter, scratching post, cat toy, cat bed, litter box, cat brush, catnip" },
  { id: "pets_other", name: "Fish, birds, small", count: 20, storeType: "pets", category: "small_pets", prompt: "fish food, aquarium, fish tank filter, bird cage, bird seed, hamster wheel, hay, rabbit pellets" },
  // Clothing (85)
  { id: "clothing_tops", name: "Tops & outerwear", count: 25, storeType: "clothing", category: "tops", prompt: "t-shirt, shirt, blouse, sweater, hoodie, jacket, coat, blazer, vest, cardigan" },
  { id: "clothing_bottom", name: "Bottoms", count: 20, storeType: "clothing", category: "bottoms", prompt: "pants, jeans, shorts, skirt, dress, suit, leggings, tracksuit, overalls" },
  { id: "clothing_access", name: "Accessories", count: 25, storeType: "clothing", category: "accessories", prompt: "socks, underwear, bra, belt, scarf, hat, gloves, tie, wallet, bag, umbrella, sunglasses" },
  { id: "clothing_shoes", name: "Footwear", count: 15, storeType: "clothing", category: "footwear", prompt: "shoes, boots, sandals, sneakers, slippers, heels, loafers, flip flops" },
  // Auto (75)
  { id: "auto_fluid", name: "Car fluids", count: 25, storeType: "auto", category: "car_fluids", prompt: "engine oil, coolant, brake fluid, windshield washer fluid, transmission fluid, car wax, car shampoo" },
  { id: "auto_parts", name: "Car parts", count: 30, storeType: "auto", category: "car_parts", prompt: "wiper blade, air filter, oil filter, brake pad, spark plug, battery, fuse, headlight bulb, tire, jack, lug wrench" },
  { id: "auto_access", name: "Car interior", count: 20, storeType: "auto", category: "car_interior", prompt: "phone mount, air freshener, seat cover, floor mat, trunk organizer, dash cam, GPS, jumper cables" },
  // Stationery (45)
  { id: "stationery_write", name: "Writing & office", count: 25, storeType: "stationery", category: "writing", prompt: "pen, pencil, eraser, sharpener, ruler, notebook, binder, folder, stapler, tape, scissors, marker, highlighter, paper" },
  { id: "stationery_school", name: "School supplies", count: 20, storeType: "stationery", category: "school", prompt: "backpack, pencil case, calculator, geometry set, colored pencils, crayons, glue stick, construction paper" },
  // Bazaar (45)
  { id: "bazaar_home", name: "Home decoration", count: 25, storeType: "bazaar", category: "home_deco", prompt: "candle, picture frame, vase, artificial flowers, storage box, basket, hooks, fairy lights" },
  { id: "bazaar_kitchen", name: "Kitchen accessories", count: 20, storeType: "bazaar", category: "kitchen_acc", prompt: "sponge, dish rack, food container, water bottle, thermos, ice cube tray, can opener, peeler, grater" },
];

export const TOTAL_SEED_PRODUCTS = SEED_CATEGORIES.reduce((a, c) => a + c.count, 0);
