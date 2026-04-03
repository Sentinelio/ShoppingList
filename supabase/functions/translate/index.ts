import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
}

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
3. Assign store category.
Return ONLY JSON: {"t":{"en":"...","es":"...", ...},"c":"category"}
Categories: fruits,vegetables,dairy,meat,bakery,grains,drinks,condiments,snacks,frozen,household,other`

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
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
