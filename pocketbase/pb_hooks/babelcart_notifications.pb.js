/// <reference path="../pb_data/types.d.ts" />

// In-app notifications: who hears about what (see lib/notify.js).
// Each handler runs isolated: shared code is loaded with require() inside it.
// A failure here is logged and never blocks the action that triggered it.

// ── Items added → the list's other active members, grouped per author ───────
onRecordAfterCreateSuccess((e) => {
  const { notify } = require(`${__hooks}/lib/notify.js`)
  try {
    const listId = e.record.getString("list_id")
    const list = e.app.findRecordById("lists", listId)
    const by = e.record.getString("added_by")
    const byName = e.record.getString("added_by_name")
    const name = e.record.getString("original")
    for (const uid of list.getStringSlice("active_members")) {
      if (uid === by) continue
      notify(e.app, uid, "items_added",
        { list: list.getString("name"), by: byName, count: 1, names: [name] },
        {
          listId: listId,
          groupKey: `items:${listId}:${by}`,
          merge: (prev, next) => ({
            list: next.list,
            by: next.by,
            count: (prev.count || 1) + 1,
            names: (prev.names || []).concat(next.names).slice(-5),
          }),
        })
    }
  } catch (err) {
    console.error("[babelcart/notify] items_added:", err)
  }
  e.next()
}, "items")

// ── Join requests and joins (lib/notify.js memberStatusChanged) ──────────
onRecordAfterCreateSuccess((e) => {
  const { memberStatusChanged } = require(`${__hooks}/lib/notify.js`)
  try {
    memberStatusChanged(e.app, e.record, "")
  } catch (err) {
    console.error("[babelcart/notify] member create:", err)
  }
  e.next()
}, "list_members")

onRecordUpdate((e) => {
  const { memberStatusChanged } = require(`${__hooks}/lib/notify.js`)
  const before = e.record.original().getString("status")
  e.next()
  try {
    memberStatusChanged(e.app, e.record, before)
  } catch (err) {
    console.error("[babelcart/notify] member update:", err)
  }
}, "list_members")

// Removed by someone else (or a pending request turned down by deleting it).
onRecordDeleteRequest((e) => {
  const { notify, userName } = require(`${__hooks}/lib/notify.js`)
  const uid = e.record.getString("user_id")
  const status = e.record.getString("status")
  const listId = e.record.getString("list_id")
  const actor = e.auth ? e.auth.id : ""
  let listName = ""
  try { listName = e.app.findRecordById("lists", listId).getString("name") } catch (_) { /* gone */ }
  e.next()
  if (!actor || actor === uid || !listName) return
  try {
    if (status === "pending") notify(e.app, uid, "join_rejected", { list: listName }, { listId: listId })
    else if (status === "active") notify(e.app, uid, "removed_from_list", { list: listName, by: userName(e.app, actor) }, { listId: listId })
  } catch (err) {
    console.error("[babelcart/notify] member delete:", err)
  }
}, "list_members")

// ── A list is deleted → its other members ──────────────────────────────────
onRecordDeleteRequest((e) => {
  const { notify, userName } = require(`${__hooks}/lib/notify.js`)
  const members = e.record.getStringSlice("active_members")
  const listName = e.record.getString("name")
  const listId = e.record.id
  const actor = e.auth ? e.auth.id : ""
  e.next()
  try {
    const byName = actor ? userName(e.app, actor) : ""
    for (const uid of members) {
      if (uid !== actor) notify(e.app, uid, "list_deleted", { list: listName, by: byName }, { listId: listId })
    }
  } catch (err) {
    console.error("[babelcart/notify] list_deleted:", err)
  }
}, "lists")

// ── Old notifications are removed after 90 days ────────────────────────────
cronAdd("babelcart_notifications_cleanup", "40 3 * * *", () => {
  const { dbDate } = require(`${__hooks}/lib/notify.js`)
  try {
    const res = $app.db()
      .newQuery("DELETE FROM notifications WHERE created_at < {:before}")
      .bind({ before: dbDate(Date.now() - 90 * 864e5) })
      .execute()
    console.log(`[babelcart/notify] cleanup: ${res.rowsAffected()} old notifications removed`)
  } catch (err) {
    console.error("[babelcart/notify] cleanup:", err)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// POST /api/babelcart/notify   (admins)  — a message from the admin
//   { title, body, target: "all" | "lang" | "users", lang?, tags?: [], dry? }
//   title/body: a string, or { en: "...", es: "..." } (the app picks the
//   user's language, then English).  →  { sent }  (with dry: { recipients })
// ─────────────────────────────────────────────────────────────────────────
routerAdd("POST", "/api/babelcart/notify", (e) => {
  const { isAdmin } = require(`${__hooks}/lib/members.js`)
  const { notify } = require(`${__hooks}/lib/notify.js`)
  if (!isAdmin(e)) throw new ForbiddenError("Admins only")

  const body = e.requestInfo().body || {}
  const text = (v) => (typeof v === "string" ? v.trim() : v && typeof v === "object" ? v : "")
  const title = text(body.title)
  const message = text(body.body)
  if (!title && !message) throw new BadRequestError("Provide 'title' or 'body'")

  let users
  if (body.target === "lang") {
    if (!body.lang) throw new BadRequestError("Provide 'lang'")
    users = $app.findRecordsByFilter("users", "lang = {:l}", "", 0, 0, { l: String(body.lang) })
  } else if (body.target === "users") {
    const tags = (Array.isArray(body.tags) ? body.tags : [])
      .map((t) => String(t).toUpperCase().replace(/[^0-9A-Z]/g, ""))
      .filter((t) => t.length === 6)
      .map((t) => t.slice(0, 3) + "-" + t.slice(3))
    if (!tags.length) throw new BadRequestError("Provide user IDs in 'tags'")
    users = tags.map((t) => { try { return $app.findFirstRecordByData("users", "tag", t) } catch (_) { return null } }).filter(Boolean)
  } else if (body.target === "all") {
    users = $app.findAllRecords("users")
  } else {
    throw new BadRequestError("target must be all, lang or users")
  }

  if (body.dry) {
    return e.json(200, { recipients: users.map((u) => ({ name: u.getString("name"), tag: u.getString("tag"), lang: u.getString("lang") })) })
  }
  for (const u of users) notify($app, u.id, "admin_message", { title: title, body: message })
  console.log(`[babelcart/notify] admin message to ${users.length} users`)
  return e.json(200, { sent: users.length })
}, $apis.requireAuth())
