/// <reference path="../pb_data/types.d.ts" />

// BabelCart — custom API routes (replace the Supabase Edge Functions and RPCs).
// All under /api/babelcart/, all require an authenticated user.
// Each handler runs isolated: shared code is loaded with require() inside it.

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/join   { code }  →  { list, status, already }
// A non-member can't see the list, so joining by code happens here.
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/join", (e) => {
  const { publicList } = require(`${__hooks}/lib/members.js`)
  const body = e.requestInfo().body || {}
  const code = String(body.code || "").trim().toUpperCase()
  if (!code) throw new BadRequestError("Missing 'code'")

  let list
  try {
    list = $app.findFirstRecordByData("lists", "code", code)
  } catch (_) {
    throw new NotFoundError("List not found")
  }

  const uid = e.auth.id
  const status = list.getBool("require_approval") ? "pending" : "active"

  let member = null
  try {
    member = $app.findFirstRecordByFilter(
      "list_members",
      "list_id = {:list} && user_id = {:user}",
      { list: list.id, user: uid },
    )
  } catch (_) { /* not a member yet */ }

  if (member) {
    // Already active or pending: report the current state. A rejected user
    // may ask again.
    if (member.getString("status") === "rejected") {
      member.set("status", status)
      $app.save(member)
    }
    return e.json(200, { list: publicList(list), status: member.getString("status"), already: true })
  }

  member = new Record($app.findCollectionByNameOrId("list_members"))
  member.set("list_id", list.id)
  member.set("user_id", uid)
  member.set("role", "member")
  member.set("status", status)
  $app.save(member)
  console.log(`[babelcart/join] user ${uid} → list ${list.id} (${status})`)

  return e.json(200, { list: publicList(list), status: status, already: false })
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// GET /api/babelcart/my-requests  →  [{ list_id, list_name, list_code, status, joined_at }]
// The user's join requests that aren't active yet — pending or rejected
// (they can't read those lists).
// ─────────────────────────────────────────────────────────────────────────
routerAdd("GET", "/api/babelcart/my-requests", (e) => {
  const rows = $app.findRecordsByFilter(
    "list_members",
    "user_id = {:user} && status != 'active'",
    "-joined_at",
    0,
    0,
    { user: e.auth.id },
  )
  const out = []
  for (const row of rows) {
    let list = null
    try { list = $app.findRecordById("lists", row.getString("list_id")) } catch (_) { continue }
    out.push({
      list_id: list.id,
      list_name: list.getString("name"),
      list_code: list.getString("code"),
      status: row.getString("status"),
      joined_at: row.getString("joined_at"),
    })
  }
  return e.json(200, out)
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/archive  { list_id, archived }  →  { list_id, archived }
// Archive / unarchive a list for the caller only (their own active
// membership row). The other members keep seeing it as before.
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/archive", (e) => {
  const body = e.requestInfo().body || {}
  const listId = String(body.list_id || "")
  if (!listId) throw new BadRequestError("Missing 'list_id'")
  if (typeof body.archived !== "boolean") throw new BadRequestError("'archived' must be true or false")

  let row
  try {
    row = $app.findFirstRecordByFilter(
      "list_members",
      "list_id = {:list} && user_id = {:user} && status = 'active'",
      { list: listId, user: e.auth.id },
    )
  } catch (_) {
    throw new NotFoundError("Not a member of this list")
  }
  row.set("archived", body.archived)
  $app.save(row)
  return e.json(200, { list_id: listId, archived: row.getBool("archived") })
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/translate   { text, langs }  →  { t, c, b }
// Same contract as the old Edge Function. The result is also saved to
// `dictionary` here (the client used to do it, but clients can't write there).
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/translate", (e) => {
  const { callClaude, extractJson } = require(`${__hooks}/lib/claude.js`)
  const { translatePrompt } = require(`${__hooks}/lib/prompts.js`)

  const body = e.requestInfo().body || {}
  const text = typeof body.text === "string" ? body.text.trim() : ""
  const langs = Array.isArray(body.langs) ? body.langs.filter((l) => typeof l === "string" && l) : []
  if (!text || langs.length === 0) {
    throw new BadRequestError("Invalid request. Provide 'text' (string) and 'langs' (string[]).")
  }
  if (text.length > 200 || langs.length > 60) {
    throw new BadRequestError("Request too large")
  }

  const res = callClaude("translate", "translate", 512, translatePrompt(text, langs))
  if (res.dryRun) return e.json(200, { dry_run: true, request: res.dryRun })

  const parsed = extractJson("translate", res.text, "object")
  const t = parsed && typeof parsed.t === "object" && parsed.t ? parsed.t : {}
  const c = typeof parsed.c === "string" && parsed.c ? parsed.c : "other"
  const b = parsed.b === true

  // Save for future lookups. Brands are keyed by their canonical English
  // form with punctuation collapsed so variants share a row (as translate.ts did).
  try {
    const normalizeKey = (s) => s.toLowerCase().trim().replace(/[\s\-_.·'"]+/g, "")
    const key = b ? normalizeKey(String(t.en || text)) : text.toLowerCase().trim()
    let rec = null
    try { rec = $app.findFirstRecordByData("dictionary", "key", key) } catch (_) { /* new */ }
    if (!rec) {
      rec = new Record($app.findCollectionByNameOrId("dictionary"))
      rec.set("key", key)
      rec.set("store_type", "grocery")
    }
    let existing = {}
    try { existing = JSON.parse(rec.getString("translations") || "{}") || {} } catch (_) { existing = {} }
    const merged = Object.assign({}, existing, t)
    if (b) {
      const canonical = t.en || Object.values(t)[0] || text
      for (const l of langs) if (!merged[l]) merged[l] = canonical
    }
    rec.set("translations", merged)
    rec.set("category", c)
    rec.set("is_brand", b)
    $app.save(rec)
  } catch (err) {
    console.error("[babelcart/translate] could not save to dictionary:", err)
  }

  return e.json(200, parsed)
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/translate-ui   { strings, targetLang, targetLangName }
//   →  { translations }
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/translate-ui", (e) => {
  const { callClaude, extractJson } = require(`${__hooks}/lib/claude.js`)
  const { translateUiPrompt } = require(`${__hooks}/lib/prompts.js`)

  const body = e.requestInfo().body || {}
  const { strings, targetLang, targetLangName } = body
  if (!strings || typeof strings !== "object" || !targetLang || !targetLangName) {
    throw new BadRequestError("Provide strings (object), targetLang (code), targetLangName (name)")
  }

  const res = callClaude("translate-ui", "ui", 4096, translateUiPrompt(strings, targetLang, targetLangName))
  if (res.dryRun) return e.json(200, { dry_run: true, request: res.dryRun })

  const translated = extractJson("translate-ui", res.text, "object")
  return e.json(200, { translations: translated })
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/parse-receipt
//   { imageBase64?, mediaType?, imageUrl?, targetLangs? }  →  ParsedReceipt
// imageBase64 takes priority over imageUrl. 422 { not_a_receipt } when the
// photo is not a receipt.
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/parse-receipt", (e) => {
  const { callClaude, extractJson } = require(`${__hooks}/lib/claude.js`)
  const { receiptPrompt } = require(`${__hooks}/lib/prompts.js`)
  const { validateReceipt } = require(`${__hooks}/lib/receipt.js`)

  const body = e.requestInfo().body || {}
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : ""
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : ""
  if (!imageUrl && !imageBase64) throw new BadRequestError("Provide imageUrl or imageBase64")

  const langs = Array.isArray(body.targetLangs) && body.targetLangs.length > 0 ? body.targetLangs : ["en"]

  const imageBlock = imageBase64
    ? {
        type: "image",
        source: {
          type: "base64",
          media_type: typeof body.mediaType === "string" && body.mediaType ? body.mediaType : "image/jpeg",
          data: imageBase64,
        },
      }
    : { type: "image", source: { type: "url", url: imageUrl } }

  const res = callClaude("parse-receipt", "receipt", 8192, [
    imageBlock,
    { type: "text", text: receiptPrompt(langs) },
  ], 180)
  if (res.dryRun) return e.json(200, { dry_run: true, request: res.dryRun })

  const parsed = extractJson("parse-receipt", res.text, "object")
  if (parsed && parsed.error === "not_a_receipt") {
    throw new ApiError(422, "not_a_receipt")
  }
  const validated = validateReceipt(parsed)
  if (!validated) {
    console.error("[babelcart/parse-receipt] invalid receipt JSON shape:", res.text.slice(0, 500))
    throw new ApiError(502, "Invalid receipt JSON shape")
  }
  return e.json(200, validated)
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/seed-dictionary   (superuser or users.is_admin)
//   { count, prompt, category?, storeType?, mode? }  →  { success, generated, inserted }
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/seed-dictionary", (e) => {
  const { callClaude, extractJson } = require(`${__hooks}/lib/claude.js`)
  const { seedPrompt } = require(`${__hooks}/lib/prompts.js`)
  const { isAdmin } = require(`${__hooks}/lib/members.js`)

  if (!isAdmin(e)) throw new ForbiddenError("Admins only")

  const body = e.requestInfo().body || {}
  const count = Number(body.count)
  const catPrompt = typeof body.prompt === "string" ? body.prompt : ""
  if (!count || !catPrompt) {
    throw new BadRequestError("Provide count, prompt, category, storeType")
  }
  const isBrandsMode = body.mode === "brands"

  const res = callClaude("seed-dictionary", "translate", 4096, seedPrompt(count, catPrompt, isBrandsMode))
  if (res.dryRun) return e.json(200, { dry_run: true, request: res.dryRun })

  const items = extractJson("seed-dictionary", res.text, "array")
  if (!Array.isArray(items)) throw new ApiError(502, "Response is not an array")

  // Brand keys collapse punctuation so "Coca-Cola" and "Coca Cola" share a row.
  const normalizeKey = (s) => s.toLowerCase().trim().replace(/[\s\-_.·'"]+/g, "")
  const collection = $app.findCollectionByNameOrId("dictionary")
  let inserted = 0
  for (const item of items) {
    const raw = String((item && item.en) || "").trim()
    if (!raw) continue
    const key = isBrandsMode ? normalizeKey(raw) : raw.toLowerCase()

    const translations = {}
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === "string" && v.trim()) translations[k] = v.trim()
    }

    try {
      let rec = null
      try { rec = $app.findFirstRecordByData("dictionary", "key", key) } catch (_) { /* new */ }
      if (!rec) {
        rec = new Record(collection)
        rec.set("key", key)
      }
      rec.set("translations", translations)
      rec.set("category", body.category || "other")
      rec.set("store_type", body.storeType || "grocery")
      rec.set("is_brand", isBrandsMode)
      $app.save(rec)
      inserted++
    } catch (err) {
      console.error(`[babelcart/seed-dictionary] could not save '${key}':`, err)
    }
  }

  return e.json(200, { success: true, generated: items.length, inserted: inserted })
}, $apis.requireAuth())

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/phrase-used   { key }   (was RPC increment_store_phrase_usage)
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/phrase-used", (e) => {
  const body = e.requestInfo().body || {}
  const key = typeof body.key === "string" ? body.key.trim() : ""
  if (!key) throw new BadRequestError("Missing 'key'")

  // Atomic increment, like the old SQL function.
  const result = $app.db()
    .newQuery("UPDATE store_phrases SET usage_count = usage_count + 1, last_used_at = {:now} WHERE `key` = {:key}")
    .bind({ key: key, now: new DateTime().string() })
    .execute()
  if (result.rowsAffected() === 0) throw new NotFoundError("Phrase not found")

  return e.noContent(204)
}, $apis.requireAuth())
