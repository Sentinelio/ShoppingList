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
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")

    const { strings, targetLang, targetLangName } = await req.json()

    if (!strings || !targetLang || !targetLangName) {
      return new Response(
        JSON.stringify({ error: "Provide strings (object), targetLang (code), targetLangName (name)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const prompt = `Translate ALL these UI strings from English to ${targetLangName} (${targetLang}).
Keep the SAME keys, only translate the values. Use natural, casual language appropriate for a mobile shopping app.

Input:
${JSON.stringify(strings, null, 2)}

Return ONLY the JSON object with translated values, no markdown, no backticks, no explanation.`

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

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Could not parse JSON from response")

    const translated = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify({ translations: translated }),
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
