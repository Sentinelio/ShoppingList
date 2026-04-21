import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeadersFor, requireAuth } from "../_shared/auth.ts"

// Strict JSON schema we ask Claude Vision to produce. The edge function
// validates the response shape before returning it to the client so the
// UI can trust the structure.
const PROMPT = `You are a receipt (paragon/ticket/factura) parser. You will be given a photo of a shopping receipt.

Extract ALL line items and metadata into strict JSON. The receipt may be in any language (Polish, Spanish, English, etc.) and any currency.

RULES:
1. "store": brand/chain name only (e.g. "Biedronka", "Lidl", "Mercadona", "Carrefour"). Lowercase OK if uppercase in header.
2. "store_address": full street address on the receipt header if visible, else null.
3. "nip" / tax_id: the seller's tax number if present (e.g. "NIP 779-10-11-327"), else null.
4. "date": ISO-8601 datetime when printed (e.g. "2024-06-07T10:44:00"). If only date, append "T00:00:00". If neither, null.
5. "currency": 3-letter ISO code ("PLN", "EUR", "USD"). Guess from symbol or totals wording if not explicit.
6. "total": numeric final amount paid (SUMA PLN / TOTAL / SUMA). Use dot decimal separator.

7. "lines": array of purchased products. For each product line:
   - "raw_name": the exact text on the receipt, as-is (include abbreviations)
   - "expanded_name": your best guess of the full product name in the receipt's language (e.g. "MlNeNanOptPl2 800G" → "Mleko Nestlé Nan Optipro Plus 2 800g")
   - "brand": best-guess brand if the product is clearly branded, else null
   - "qty": numeric quantity. If the receipt shows "1,526 x5,99" the qty is 1.526 (kg). If "3 x7,99" the qty is 3.
   - "unit": "kg" if qty has decimals from weighing, "pcs" otherwise, or "l"/"ml" if clearly stated.
   - "unit_price": price per unit (the "x5,99" part). Dot decimal.
   - "total_price": line total after any OPUST/discount subtraction. Dot decimal.
   - "discount": absolute discount amount for this line (e.g. OPUST -1,90 → 1.90). 0 if none.
   - "tax_category": the single letter (A/B/C/F/X/etc.) shown next to the product if any, else null.
   - "confidence": "high" if text is clear, "low" if partially illegible.

8. IGNORE these lines (do NOT include them in "lines"): OPUSTY ŁĄCZNIE, SPRZEDAŻ OPODATKOWANA, PTU, SUMA PTU, ROZLICZENIE PŁATNOŚCI, card/payment details, barcodes, footer promos, NIP lines, store address lines. Those belong in the top-level fields or are discarded.

9. An OPUST/discount immediately below a product line belongs to the product ABOVE it. Merge it into that product's discount and adjust total_price accordingly.

10. If the photo is NOT a receipt, return: {"error":"not_a_receipt"}

Return ONLY the JSON object, no markdown fences, no commentary.

Example shape:
{"store":"Biedronka","store_address":"ul. Czarnoleska 9, 26-600 Radom","nip":"779-10-11-327","date":"2024-06-07T10:44:00","currency":"PLN","total":238.79,"lines":[{"raw_name":"MlNeNanOptPl2 800G","expanded_name":"Mleko Nestlé Nan Optipro Plus 2 800g","brand":"Nestlé","qty":1,"unit":"pcs","unit_price":69.99,"total_price":69.99,"discount":0,"tax_category":"C","confidence":"high"}]}`

interface ParsedLine {
  raw_name: string
  expanded_name: string | null
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
      return {
        raw_name: typeof line.raw_name === "string" ? line.raw_name : "",
        expanded_name: typeof line.expanded_name === "string" ? line.expanded_name : null,
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

    const { imageUrl, imageBase64, mediaType } = await req.json() as {
      imageUrl?: string
      imageBase64?: string
      mediaType?: string
    }

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Provide imageUrl or imageBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Build the image content block. Anthropic accepts either base64 or URL.
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            imageBlock,
            { type: "text", text: PROMPT },
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
