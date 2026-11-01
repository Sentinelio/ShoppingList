/// <reference path="../pb_data/types.d.ts" />

// Session transfer between two addresses of the app (see migration
// 1792540007): a one-time code, valid 5 minutes, that carries this
// device's saved credentials to the other address.
// Each handler runs isolated: shared code is loaded with require() inside it.

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/transfer/create  { email, password }  →  { code, expires_at }
// The signed-in user only, with their own credentials (checked).
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/transfer/create", (e) => {
  const body = e.requestInfo().body || {}
  const email = String(body.email || "")
  const password = String(body.password || "")
  if (!email || !password) throw new BadRequestError("Provide email and password")
  if (email.toLowerCase() !== e.auth.email().toLowerCase() || !e.auth.validatePassword(password)) {
    throw new BadRequestError("These aren't this account's credentials")
  }

  // One pending code per user.
  $app.db().newQuery("DELETE FROM session_transfers WHERE user = {:u}").bind({ u: e.auth.id }).execute()

  const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
  const code = $security.randomStringWithAlphabet(8, ALPHABET)
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString().replace("T", " ")
  const rec = new Record($app.findCollectionByNameOrId("session_transfers"))
  rec.set("user", e.auth.id)
  rec.set("code", code)
  rec.set("email", email)
  rec.set("password", password)
  rec.set("expires_at", expires)
  $app.save(rec)
  return e.json(200, { code: code, expires_at: expires })
}, $apis.requireAuth("users"))

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/transfer/redeem  { code }  →  { email, password }
// No session needed (it's how the other address gets one). The code works
// once: it's deleted when redeemed, expired or not.
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/transfer/redeem", (e) => {
  const body = e.requestInfo().body || {}
  const code = String(body.code || "").toUpperCase().replace(/[^0-9A-Z]/g, "")
  if (code.length !== 8) throw new BadRequestError("Invalid code")
  let rec
  try {
    rec = $app.findFirstRecordByData("session_transfers", "code", code)
  } catch (_) {
    throw new NotFoundError("This code doesn't exist or was already used")
  }
  const expired = new Date(rec.getString("expires_at").replace(" ", "T")).getTime() < Date.now()
  const result = { email: rec.getString("email"), password: rec.getString("password") }
  $app.delete(rec)
  if (expired) throw new BadRequestError("This code expired")
  return e.json(200, result)
})

// Expired codes that were never redeemed.
cronAdd("babelcart_session_transfers_cleanup", "*/30 * * * *", () => {
  try {
    $app.db()
      .newQuery("DELETE FROM session_transfers WHERE expires_at < {:now}")
      .bind({ now: new Date().toISOString().replace("T", " ") })
      .execute()
  } catch (err) {
    console.error("[babelcart/transfer] cleanup:", err)
  }
})
