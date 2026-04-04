import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
}

// All 58 categories across 12 store types
const CATEGORIES_LIST = [
  // Grocery
  "fruits (apples, bananas, berries)",
  "vegetables (leafy greens, root veg, mushrooms)",
  "dairy (milk, cheese, yogurt, eggs)",
  "meat (beef, pork, chicken, fish, seafood)",
  "bakery (bread, pastries, cakes)",
  "grains (pasta, rice, flour, cereals)",
  "drinks (water, juice, soda, tea, coffee, beer, wine)",
  "snacks (chips, cookies, chocolate, candy)",
  "condiments (sauces, oils, spices, sweeteners)",
  "frozen (frozen meals, ice cream, canned food)",
  "household (cleaning: detergent, sponges, trash bags, foil)",
  "baby (diapers, wipes, baby food, toilet paper, tissues)",
  // Drugstore
  "skincare (face cream, body lotion, sunscreen, masks)",
  "haircare (shampoo, conditioner, dye, gel, hairspray)",
  "bodycare (shower gel, soap, deodorant, razor)",
  "oralcare (toothpaste, toothbrush, mouthwash, floss)",
  "makeup (foundation, mascara, lipstick, nail polish)",
  "cleaning (laundry detergent, fabric softener, floor cleaner)",
  // Pharmacy
  "medicines (ibuprofen, paracetamol, cough syrup, eye drops)",
  "firstaid (bandages, plasters, thermometer, pregnancy test)",
  "vitamins (vitamin C, D, iron, magnesium, multivitamin)",
  // Electronics
  "phones (smartphone, phone case, charger, cable, earbuds)",
  "computers (laptop, monitor, mouse, keyboard, USB drive)",
  "tv_audio (television, soundbar, speaker, headphones, HDMI)",
  "appliances (vacuum, microwave, fridge, washer, blender, kettle, teapot, toaster)",
  "small_elec (batteries, light bulb, extension cord, flashlight)",
  // Sports
  "fitness (running shoes, leggings, yoga mat, dumbbells)",
  "outdoor (tent, sleeping bag, backpack, hiking boots, camping stove)",
  "water_sports (swimsuit, goggles, snorkel, wetsuit)",
  "ball_sports (football, basketball, tennis racket, cleats)",
  "cycling (bicycle, helmet, lock, pump, cycling shorts)",
  "winter (ski, snowboard, snow goggles, ski jacket)",
  // Hardware
  "tools (hammer, screwdriver, pliers, wrench, drill, saw, tape measure)",
  "fasteners (screws, nails, bolts, glue, silicone, tape)",
  "electrical (switch, socket, cable, LED bulb, fuse)",
  "plumbing (pipe, faucet, valve, shower head, drain)",
  "paint (paint, brush, roller, primer, varnish, wallpaper)",
  "garden (plant pot, soil, fertilizer, hose, lawnmower)",
  "building (cement, plaster, brick, tile, insulation)",
  "security (lock, padlock, key, door handle, alarm)",
  // Furniture
  "living (sofa, armchair, coffee table, rug, curtain, lamp)",
  "bedroom (bed, mattress, pillow, duvet, wardrobe)",
  "kitchen_items (plate, bowl, glass, mug, cutlery, pan, pot, cutting board, kettle, teapot)",
  "bathroom (towel, bath mat, shower curtain, toilet brush)",
  "office (desk, office chair, drawer unit, whiteboard)",
  // Pets
  "dog (dog food, leash, collar, dog bed, chew toy)",
  "cat (cat food, cat litter, scratching post, cat toy)",
  "small_pets (fish food, aquarium, bird cage, hamster wheel)",
  // Clothing
  "tops (t-shirt, shirt, sweater, hoodie, jacket, coat)",
  "bottoms (pants, jeans, shorts, skirt, dress, leggings)",
  "accessories (socks, underwear, bra, belt, scarf, hat, bag)",
  "footwear (shoes, boots, sandals, sneakers, slippers)",
  // Auto
  "car_fluids (engine oil, coolant, brake fluid, car wax)",
  "car_parts (wiper blade, air filter, brake pad, battery, tire)",
  "car_interior (phone mount, air freshener, seat cover, floor mat)",
  // Stationery
  "writing (pen, pencil, eraser, notebook, stapler, scissors)",
  "school (backpack, pencil case, calculator, colored pencils)",
  // Bazaar
  "home_deco (candle, picture frame, vase, artificial flowers)",
  "kitchen_acc (sponge, dish rack, food container, can opener)",
  "other",
]

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

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
2. Translate into ALL these languages: ${langs.join(", ")}
3. Assign the MOST SPECIFIC store category from this list. Only return the key (e.g. "tools", not "tools (hammer, ...)"). If unsure, pick the closest match. Do not default to "household" or "other" unless truly nothing fits.

Categories (key — examples):
${CATEGORIES_LIST.join("\n")}

Return ONLY JSON, no markdown: {"t":{"en":"...","es":"...", ...},"c":"category_key"}`

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
