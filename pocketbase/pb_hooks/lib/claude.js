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
function callClaude(tag, kind, maxTokens, content, timeoutSec) {
  const model = modelFor(kind)
  const payload = {
    model: model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: content }],
  }

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

  let res
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
    console.error(`[babelcart/${tag}] request to Anthropic failed:`, err)
    throw new ApiError(502, "Could not reach the Anthropic API")
  }

  if (res.statusCode !== 200) {
    console.error(`[babelcart/${tag}] Anthropic API error (${res.statusCode}) model=${model}:`, toString(res.body))
    throw new ApiError(502, `Anthropic API error (${res.statusCode})`)
  }

  const blocks = (res.json && res.json.content) || []
  const first = blocks.find((b) => b.type === "text")
  return { text: first ? first.text : "", stopReason: (res.json && res.json.stop_reason) || "" }
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
