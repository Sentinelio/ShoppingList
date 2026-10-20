import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeadersFor, requireAuth } from "../_shared/auth.ts"

// Category keys the parser may assign. Keep in sync with src/data/categories.ts.
// Same list as the translate function uses, but we only need the KEYS here —
// the parse-receipt prompt is already long, so we skip the example words.
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

function buildPrompt(targetLangs: string[]): string {
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

interface ParsedLine {
  raw_name: string
  expanded_name: string | null
  translations: Record<string, string>
  category: string
  brand: string | null
  qty: number | null
  unit: string | null
  unit_price: number | null
  total_price: number | null
  discount: number | null
  tax_category: string | null
  confidence: string | null
}

interface ParsedReceipt {
  store: string | null
  store_address: string | null
  nip: string | null
  date: string | null
  currency: string
  total: number | null
  lines: ParsedLine[]
}

function validateReceipt(obj: unknown): ParsedReceipt | null {
  if (!obj || typeof obj !== "object") return null
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.lines)) return null
  return {
    store: typeof o.store === "string" ? o.store : null,
    store_address: typeof o.store_address === "string" ? o.store_address : null,
    nip: typeof o.nip === "string" ? o.nip : null,
    date: typeof o.date === "string" ? o.date : null,
    currency: typeof o.currency === "string" ? o.currency : "EUR",
    total: typeof o.total === "number" ? o.total : null,
    lines: o.lines.map((l) => {
      const line = l as Record<string, unknown>
      const translations: Record<string, string> = {}
      if (line.translations && typeof line.translations === "object") {
        for (const [k, v] of Object.entries(line.translations as Record<string, unknown>)) {
          if (typeof v === "string") translations[k] = v
        }
      }
      return {
        raw_name: typeof line.raw_name === "string" ? line.raw_name : "",
        expanded_name: typeof line.expanded_name === "string" ? line.expanded_name : null,
        translations,
        category: typeof line.category === "string" ? line.category : "other",
        brand: typeof line.brand === "string" ? line.brand : null,
        qty: typeof line.qty === "number" ? line.qty : null,
        unit: typeof line.unit === "string" ? line.unit : null,
        unit_price: typeof line.unit_price === "number" ? line.unit_price : null,
        total_price: typeof line.total_price === "number" ? line.total_price : null,
        discount: typeof line.discount === "number" ? line.discount : 0,
        tax_category: typeof line.tax_category === "string" ? line.tax_category : null,
        confidence: typeof line.confidence === "string" ? line.confidence : "high",
      }
    }).filter((l) => l.raw_name.length > 0),
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const unauthorized = requireAuth(req)
  if (unauthorized) return unauthorized

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")

    const { imageUrl, imageBase64, mediaType, targetLangs } = await req.json() as {
      imageUrl?: string
      imageBase64?: string
      mediaType?: string
      targetLangs?: string[]
    }

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Provide imageUrl or imageBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const langs = (targetLangs && targetLangs.length > 0) ? targetLangs : ["en"]

    const imageBlock = imageBase64
      ? {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType ?? "image/jpeg",
            data: imageBase64,
          },
        }
      : {
          type: "image",
          source: { type: "url", url: imageUrl },
        }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            imageBlock,
            { type: "text", text: buildPrompt(langs) },
          ],
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      throw new Error(`Anthropic API error (${anthropicRes.status}): ${errBody}`)
    }

    const anthropicData = await anthropicRes.json()
    const content = anthropicData?.content?.[0]?.text ?? ""

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Could not parse receipt response")

    const parsed = JSON.parse(jsonMatch[0])
    if (parsed?.error === "not_a_receipt") {
      return new Response(
        JSON.stringify({ error: "not_a_receipt" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const validated = validateReceipt(parsed)
    if (!validated) throw new Error("Invalid receipt JSON shape")

    return new Response(
      JSON.stringify(validated),
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
