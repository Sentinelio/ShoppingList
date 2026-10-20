import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { corsHeadersFor, requireAuth } from "../_shared/auth.ts"

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { count, prompt: catPrompt, category, storeType, mode } = await req.json() as {
      count: number; prompt: string; category?: string; storeType?: string; mode?: "generic" | "brands"
    }

    if (!count || !catPrompt) {
      return new Response(
        JSON.stringify({ error: "Provide count, prompt, category, storeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const isBrandsMode = mode === "brands"
    const langs = "en, es, pl, de, fr, it, pt"
    const prompt = isBrandsMode
      ? `You are building a brand-name dictionary for a shopping list app. Generate a list of ${count} popular BRAND / trademarked products sold in the "${catPrompt}" section of a store. Mix international brands (Coca-Cola, Nutella, Heinz…) with popular regional ones from Spain, Poland, Germany, France, Italy and Portugal.

For EACH brand, return the SAME canonical name in all languages (brand names don't translate). Preserve the trademark's official spelling (capitalization, hyphens, accents).

Return ONLY a JSON array, no markdown, no backticks:
[{"en":"Coca-Cola","es":"Coca-Cola","pl":"Coca-Cola","de":"Coca-Cola","fr":"Coca-Cola","it":"Coca-Cola","pt":"Coca-Cola"},{"en":"Nutella","es":"Nutella","pl":"Nutella","de":"Nutella","fr":"Nutella","it":"Nutella","pt":"Nutella"},...]

Rules:
- Only real brands, no generic descriptions
- Same exact string for all 7 languages
- ${count} distinct brands, no duplicates
- All 7 languages required per entry`
      : `You are a product translation dictionary builder. Generate a list of ${count} common ${catPrompt} that people buy regularly.

For EACH product, provide translations in these languages: ${langs}

Return ONLY a JSON array, no markdown, no backticks:
[{"en":"milk","es":"leche","pl":"mleko","de":"Milch","fr":"lait","it":"latte","pt":"leite"},...]

Rules:
- Use the most common/generic name (not brand names)
- Use singular forms
- ${count} products, no duplicates
- Every product MUST have all 7 languages`

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      throw new Error(`Anthropic API error (${anthropicRes.status}): ${errBody}`)
    }

    const anthropicData = await anthropicRes.json()
    const content = anthropicData?.content?.[0]?.text ?? ""

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error("Could not parse array from response")

    const items = JSON.parse(jsonMatch[0])
    if (!Array.isArray(items)) throw new Error("Response is not an array")

    // Insert each item into dictionary. Brand keys collapse punctuation so
    // "Coca-Cola" and "Coca Cola" share a row.
    const normalizeKey = (s: string) => s.toLowerCase().trim().replace(/[\s\-_.·'"]+/g, "")
    let inserted = 0
    for (const item of items) {
      const raw = (item.en || "").trim()
      if (!raw) continue
      const key = isBrandsMode ? normalizeKey(raw) : raw.toLowerCase()

      const translations: Record<string, string> = {}
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === "string" && v.trim()) {
          translations[k] = v.trim()
        }
      }

      const { error } = await supabase.from("dictionary").upsert({
        key,
        translations,
        category: category || "other",
        store_type: storeType || "grocery",
        is_brand: isBrandsMode,
      })

      if (!error) inserted++
    }

    return new Response(
      JSON.stringify({ success: true, generated: items.length, inserted }),
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
