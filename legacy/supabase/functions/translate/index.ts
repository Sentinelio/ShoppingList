import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeadersFor, requireAuth } from "../_shared/auth.ts"


// All categories across 27 store types. Keep in sync with src/data/categories.ts
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

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const unauthorized = requireAuth(req)
  if (unauthorized) return unauthorized

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }

    const { text, langs } = await req.json() as { text: string; langs: string[] }

    if (!text || !langs || !Array.isArray(langs) || langs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request. Provide 'text' (string) and 'langs' (string[])." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const prompt = `You are a shopping list assistant. A user wants to buy: "${text}"

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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      throw new Error(`Anthropic API error (${anthropicRes.status}): ${errBody}`)
    }

    const anthropicData = await anthropicRes.json()
    const content = anthropicData?.content?.[0]?.text ?? ""

    // Extract JSON from the response (handle possible markdown fences)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse translation response")
    }

    const parsed = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
