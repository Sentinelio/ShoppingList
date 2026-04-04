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
  { id: "grocery_baby", name: "Baby & Hygiene", count: 25, storeType: "grocery", category: "household", prompt: "diapers, wipes, baby food, baby formula, toilet paper, tissues, cotton pads" },
  // Drugstore (175)
  { id: "drugstore_skin", name: "Skincare", count: 35, storeType: "drugstore", category: "household", prompt: "face cream, body lotion, sunscreen, lip balm, micellar water, face masks, serum, toner, exfoliant" },
  { id: "drugstore_hair", name: "Haircare", count: 30, storeType: "drugstore", category: "household", prompt: "shampoo types, conditioner, hair mask, hair dye, gel, mousse, hairspray, dry shampoo" },
  { id: "drugstore_body", name: "Body care", count: 30, storeType: "drugstore", category: "household", prompt: "shower gel, soap, deodorant, razor, shaving cream, body scrub, intimate hygiene" },
  { id: "drugstore_oral", name: "Oral care", count: 15, storeType: "drugstore", category: "household", prompt: "toothpaste, toothbrush, mouthwash, dental floss, teeth whitening" },
  { id: "drugstore_makeup", name: "Makeup", count: 35, storeType: "drugstore", category: "household", prompt: "foundation, mascara, lipstick, eyeliner, eyeshadow, blush, concealer, powder, nail polish" },
  { id: "drugstore_clean", name: "Cleaning products", count: 30, storeType: "drugstore", category: "household", prompt: "laundry detergent, fabric softener, stain remover, floor cleaner, window cleaner, disinfectant" },
  // Pharmacy (80)
  { id: "pharmacy_meds", name: "Common medicines", count: 30, storeType: "pharmacy", category: "other", prompt: "ibuprofen, paracetamol, aspirin, antacid, cough syrup, throat lozenges, nasal spray, eye drops" },
  { id: "pharmacy_first", name: "First aid", count: 25, storeType: "pharmacy", category: "other", prompt: "bandages, plasters, thermometer, blood pressure monitor, pregnancy test, condoms" },
  { id: "pharmacy_vita", name: "Vitamins", count: 25, storeType: "pharmacy", category: "other", prompt: "vitamin C, D, B12, iron, magnesium, omega-3, multivitamin, probiotics, melatonin" },
  // Electronics (145)
  { id: "electronics_phone", name: "Phones & accessories", count: 25, storeType: "electronics", category: "other", prompt: "smartphone, phone case, charger, USB cable, screen protector, power bank, earbuds" },
  { id: "electronics_comp", name: "Computers", count: 30, storeType: "electronics", category: "other", prompt: "laptop, desktop, monitor, mouse, keyboard, webcam, USB drive, external hard drive, printer" },
  { id: "electronics_tv", name: "TV & audio", count: 25, storeType: "electronics", category: "other", prompt: "television, remote control, soundbar, speaker, headphones, HDMI cable, streaming device" },
  { id: "electronics_home", name: "Home appliances", count: 40, storeType: "electronics", category: "other", prompt: "vacuum cleaner, iron, hair dryer, toaster, microwave, oven, refrigerator, washing machine, dishwasher, air conditioner, heater, fan, blender, coffee maker, kettle" },
  { id: "electronics_small", name: "Small electronics", count: 25, storeType: "electronics", category: "other", prompt: "batteries, light bulb, extension cord, power strip, adapter, surge protector, flashlight, timer" },
  // Sports (120)
  { id: "sports_run", name: "Running & fitness", count: 30, storeType: "sports", category: "other", prompt: "running shoes, sports bra, leggings, shorts, t-shirt, water bottle, yoga mat, dumbbells, resistance band, jump rope, fitness tracker" },
  { id: "sports_out", name: "Outdoor & camping", count: 30, storeType: "sports", category: "other", prompt: "tent, sleeping bag, backpack, hiking boots, trekking poles, headlamp, compass, camping stove, cooler" },
  { id: "sports_water", name: "Water sports", count: 20, storeType: "sports", category: "other", prompt: "swimsuit, goggles, swim cap, towel, snorkel, fins, inflatable, wetsuit, surfboard" },
  { id: "sports_ball", name: "Ball sports", count: 25, storeType: "sports", category: "other", prompt: "football, basketball, tennis racket, tennis ball, padel racket, volleyball, goal, shin guards, cleats" },
  { id: "sports_bike", name: "Cycling", count: 20, storeType: "sports", category: "other", prompt: "bicycle, helmet, lock, pump, lights, gloves, water bottle holder, cycling shorts, repair kit" },
  { id: "sports_winter", name: "Winter sports", count: 20, storeType: "sports", category: "other", prompt: "ski, ski boots, ski poles, snowboard, snow goggles, ski jacket, gloves, thermal underwear, ice skates" },
  // Hardware (225)
  { id: "hardware_tools", name: "Hand tools", count: 35, storeType: "hardware", category: "other", prompt: "hammer, screwdriver, pliers, wrench, saw, tape measure, level, drill, drill bits, sandpaper" },
  { id: "hardware_fix", name: "Fasteners", count: 30, storeType: "hardware", category: "other", prompt: "screws, nails, bolts, nuts, wall plugs, glue, silicone, tape, cable ties, hooks" },
  { id: "hardware_elec", name: "Electrical", count: 30, storeType: "hardware", category: "other", prompt: "light switch, socket, plug, cable, wire, fuse, circuit breaker, LED bulb, spotlight, lamp" },
  { id: "hardware_plumb", name: "Plumbing", count: 25, storeType: "hardware", category: "other", prompt: "pipe, tap, faucet, valve, seal, washer, toilet seat, shower head, drain, siphon, water heater" },
  { id: "hardware_paint", name: "Paint & decoration", count: 30, storeType: "hardware", category: "other", prompt: "paint, brush, roller, primer, varnish, wallpaper, masking tape, paint tray, ladder, drop cloth" },
  { id: "hardware_garden", name: "Garden", count: 30, storeType: "hardware", category: "other", prompt: "plant pot, soil, fertilizer, seeds, hose, watering can, lawnmower, pruning shears, rake, shovel, wheelbarrow" },
  { id: "hardware_build", name: "Building materials", count: 25, storeType: "hardware", category: "other", prompt: "cement, plaster, brick, tile, grout, insulation, drywall, wood plank, beam, roofing" },
  { id: "hardware_lock", name: "Security & locks", count: 20, storeType: "hardware", category: "other", prompt: "lock, padlock, key, deadbolt, door handle, hinge, chain, alarm, doorbell, peephole" },
  // Furniture (115)
  { id: "furniture_living", name: "Living room", count: 25, storeType: "furniture", category: "other", prompt: "sofa, armchair, coffee table, bookshelf, TV stand, rug, cushion, throw, curtain, lamp" },
  { id: "furniture_bed", name: "Bedroom", count: 25, storeType: "furniture", category: "other", prompt: "bed, mattress, pillow, duvet, bed sheet, wardrobe, nightstand, mirror, hanger, clothes rack" },
  { id: "furniture_kitchen", name: "Kitchen items", count: 25, storeType: "furniture", category: "other", prompt: "plate, bowl, glass, mug, cutlery, knife, cutting board, pan, pot, baking tray, container" },
  { id: "furniture_bath", name: "Bathroom", count: 20, storeType: "furniture", category: "other", prompt: "towel, bath mat, shower curtain, soap dispenser, toilet brush, laundry basket, shelf, cabinet" },
  { id: "furniture_office", name: "Office", count: 20, storeType: "furniture", category: "other", prompt: "desk, office chair, lamp, drawer unit, whiteboard, bulletin board, pen holder, file organizer" },
  // Pets (70)
  { id: "pets_dog", name: "Dog", count: 25, storeType: "pets", category: "other", prompt: "dog food, dog treats, leash, collar, harness, dog bed, chew toy, dog bowl, dog shampoo" },
  { id: "pets_cat", name: "Cat", count: 25, storeType: "pets", category: "other", prompt: "cat food, cat litter, scratching post, cat toy, cat bed, litter box, cat brush, catnip" },
  { id: "pets_other", name: "Fish, birds, small", count: 20, storeType: "pets", category: "other", prompt: "fish food, aquarium, fish tank filter, bird cage, bird seed, hamster wheel, hay, rabbit pellets" },
  // Clothing (85)
  { id: "clothing_tops", name: "Tops & outerwear", count: 25, storeType: "clothing", category: "other", prompt: "t-shirt, shirt, blouse, sweater, hoodie, jacket, coat, blazer, vest, cardigan" },
  { id: "clothing_bottom", name: "Bottoms", count: 20, storeType: "clothing", category: "other", prompt: "pants, jeans, shorts, skirt, dress, suit, leggings, tracksuit, overalls" },
  { id: "clothing_access", name: "Accessories", count: 25, storeType: "clothing", category: "other", prompt: "socks, underwear, bra, belt, scarf, hat, gloves, tie, wallet, bag, umbrella, sunglasses" },
  { id: "clothing_shoes", name: "Footwear", count: 15, storeType: "clothing", category: "other", prompt: "shoes, boots, sandals, sneakers, slippers, heels, loafers, flip flops" },
  // Auto (75)
  { id: "auto_fluid", name: "Car fluids", count: 25, storeType: "auto", category: "other", prompt: "engine oil, coolant, brake fluid, windshield washer fluid, transmission fluid, car wax, car shampoo" },
  { id: "auto_parts", name: "Car parts", count: 30, storeType: "auto", category: "other", prompt: "wiper blade, air filter, oil filter, brake pad, spark plug, battery, fuse, headlight bulb, tire, jack, lug wrench" },
  { id: "auto_access", name: "Car interior", count: 20, storeType: "auto", category: "other", prompt: "phone mount, air freshener, seat cover, floor mat, trunk organizer, dash cam, GPS, jumper cables" },
  // Stationery (45)
  { id: "stationery_write", name: "Writing & office", count: 25, storeType: "stationery", category: "other", prompt: "pen, pencil, eraser, sharpener, ruler, notebook, binder, folder, stapler, tape, scissors, marker, highlighter, paper" },
  { id: "stationery_school", name: "School supplies", count: 20, storeType: "stationery", category: "other", prompt: "backpack, pencil case, calculator, geometry set, colored pencils, crayons, glue stick, construction paper" },
  // Bazaar (45)
  { id: "bazaar_home", name: "Home decoration", count: 25, storeType: "bazaar", category: "other", prompt: "candle, picture frame, vase, artificial flowers, storage box, basket, hooks, fairy lights" },
  { id: "bazaar_kitchen", name: "Kitchen accessories", count: 20, storeType: "bazaar", category: "other", prompt: "sponge, dish rack, food container, water bottle, thermos, ice cube tray, can opener, peeler, grater" },
];

export const TOTAL_SEED_PRODUCTS = SEED_CATEGORIES.reduce((a, c) => a + c.count, 0);
