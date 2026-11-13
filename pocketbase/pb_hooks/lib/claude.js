// Calls the Anthropic Messages API from a PocketBase JSVM handler.
// PocketBase has no fetch(): requests go through $http.send.
//
// Env vars (set on the PocketBase service):
//   ANTHROPIC_API_KEY          required
//   BABELCART_MODEL_TRANSLATE  default claude-haiku-5-5  (translate, seed-dictionary)
//   BABELCART_MODEL_UI         default claude-haiku-5-5  (translate-ui)
//   BABELCART_MODEL_RECEIPT    default claude-sonnet-5-5 (parse-receipt)
//   BABELCART_DRY_RUN=1        never call Claude; routes answer with the
//                              request they would have sent (local tests)

const DEFAULT_MODELS = {
  translate: "claude-haiku-5-5",
  ui: "claude-haiku-5-5",
  receipt: "claude-sonnet-5-5",
}

const ENV_MODELS = {
  translate: "BABELCART_MODEL_TRANSLATE",
  ui: "BABELCART_MODEL_UI",
  receipt: "BABELCART_MODEL_RECEIPT",
}

function modelFor(kind) {
  return $os.getenv(ENV_MODELS[kind]) || DEFAULT_MODELS[kind]
}

function isDryRun() {
  return $os.getenv("BABELCART_DRY_RUN") === "1"
}

// Sends one user message. `content` is a string or an array of content
// blocks. Returns { text } with the first text block, or { dryRun } with the
// request summary when BABELCART_DRY_RUN=1.
// `schema` (optional): a JSON schema the reply must follow (structured
// outputs): the model can't write text before the JSON or break its shape.
// If the API refuses it (400 about the format), the call is sent once more
// without it, as before.
function callClaude(tag, kind, maxTokens, content, timeoutSec, schema) {
  const model = modelFor(kind)
  const payload = {
    model: model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: content }],
  }
  if (schema) payload.output_config = { format: { type: "json_schema", schema: schema } }

  if (isDryRun()) {
    const textBlocks = typeof content === "string"
      ? [content]
      : content.filter((b) => b.type === "text").map((b) => b.text)
    const imageBlocks = typeof content === "string"
      ? []
      : content.filter((b) => b.type === "image").map((b) => b.source.type)
    console.log(`[babelcart/${tag}] dry run: would call ${model}`)
    return {
      dryRun: {
        model: model,
        max_tokens: maxTokens,
        prompt: textBlocks.join("\n"),
        images: imageBlocks,
      },
    }
  }

  const apiKey = $os.getenv("ANTHROPIC_API_KEY")
  if (!apiKey) {
    console.error(`[babelcart/${tag}] ANTHROPIC_API_KEY is not configured`)
    throw new ApiError(500, "ANTHROPIC_API_KEY is not configured")
  }

  // Anthropic answers 429 / 5xx / 529 when it is busy for a moment: retry a
  // few times, waiting longer each time (or what retry-after says), instead
  // of failing the user's action at the first hiccup. Only quick answers
  // are retried: a call that failed after a long time (timeout, or 25 s
  // gone in total) is not repeated — the browser has stopped waiting, and
  // repeating it would only cost again.
  const RETRYABLE = [408, 409, 429, 500, 502, 503, 504, 529]
  const WAITS = [2000, 5000, 12000]
  const started = Date.now()
  let res
  for (let attempt = 0; ; attempt++) {
    let netErr = null
    res = null
    const t0 = Date.now()
    try {
      res = $http.send({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
        timeout: timeoutSec || 120,
      })
    } catch (err) {
      netErr = err
    }
    if (res && res.statusCode === 400 && payload.output_config && /output_config|format|schema/i.test(toString(res.body))) {
      console.warn(`[babelcart/${tag}] structured output refused, sending without it:`, toString(res.body).slice(0, 300))
      delete payload.output_config
      continue
    }
    const quick = Date.now() - t0 < 15000
    const retryable = quick && (netErr || RETRYABLE.includes(res.statusCode))
    if (!retryable || attempt >= WAITS.length || Date.now() - started > 25000) break
    let wait = WAITS[attempt]
    try {
      const ra = Number(res && res.headers && (res.headers["Retry-After"] || res.headers["retry-after"]))
      if (ra > 0 && ra <= 30) wait = ra * 1000
    } catch (_) { /* no header */ }
    console.warn(`[babelcart/${tag}] Anthropic ${netErr ? "unreachable" : res.statusCode}, retry ${attempt + 1}/${WAITS.length} in ${wait} ms`)
    sleep(wait)
  }
  if (!res) {
    console.error(`[babelcart/${tag}] request to Anthropic failed after retries`)
    throw new ApiError(502, "Could not reach the Anthropic API")
  }

  if (res.statusCode !== 200) {
    console.error(`[babelcart/${tag}] Anthropic API error (${res.statusCode}) model=${model}:`, toString(res.body))
    throw new ApiError(502, `Anthropic API error (${res.statusCode})`)
  }

  const blocks = (res.json && res.json.content) || []
  const first = blocks.find((b) => b.type === "text")
  const usage = (res.json && res.json.usage) || {}
  return {
    text: first ? first.text : "",
    stopReason: (res.json && res.json.stop_reason) || "",
    model: model,
    usage: { input: Number(usage.input_tokens) || 0, output: Number(usage.output_tokens) || 0 },
  }
}

// Extracts and parses the first {...} (or [...]) JSON value from a model reply,
// tolerating markdown fences, like the Edge Functions did.
function extractJson(tag, text, kind) {
  const m = kind === "array" ? text.match(/\[[\s\S]*\]/) : text.match(/\{[\s\S]*\}/)
  if (!m) {
    console.error(`[babelcart/${tag}] no JSON in model reply:`, text.slice(0, 500))
    throw new ApiError(502, kind === "array" ? "Could not parse array from response" : "Could not parse JSON from response")
  }
  try {
    return JSON.parse(m[0])
  } catch (err) {
    console.error(`[babelcart/${tag}] invalid JSON in model reply:`, err, text.slice(0, 500))
    throw new ApiError(502, "Model returned invalid JSON")
  }
}

// Reply cut by max_tokens: keeps the complete flat {...} entries after the
// opening "[" (the last, unfinished one is dropped).
function extractCompleteObjects(text) {
  const start = text.indexOf("[")
  if (start < 0) return []
  const out = []
  for (const m of text.slice(start).match(/\{[^{}]*\}/g) || []) {
    try { out.push(JSON.parse(m)) } catch (_) { /* skip a broken entry */ }
  }
  return out
}

module.exports = { callClaude, extractJson, extractCompleteObjects, modelFor, isDryRun }
