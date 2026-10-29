/// <reference path="../pb_data/types.d.ts" />

// BabelCart — list membership hooks.
// Each handler runs isolated: shared code is loaded with require() inside it.

// ── Guards: fields that only hooks / superusers may write ──────────────────
// The collection rules already reject these keys with `:isset = false`; this
// also catches modifier keys ("active_members+", "owners-") and explains why.

onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    for (const key of Object.keys(e.requestInfo().body || {})) {
      const field = key.replace(/[+-]$/, "").replace(/^[+-]/, "")
      if (field === "active_members" || field === "owners") {
        throw new ForbiddenError(`'${field}' is managed by the server`)
      }
    }
  }
  // Defaults that Postgres had (bool/select fields have no defaults here).
  const body = e.requestInfo().body || {}
  if (!("require_approval" in body)) e.record.set("require_approval", true)
  if (!e.record.getString("who_can_approve")) e.record.set("who_can_approve", "owner")
  if (!e.record.getString("who_can_remove")) e.record.set("who_can_remove", "owner")
  // The list's country defaults to the creator's.
  if (!e.record.getString("country")) {
    try {
      const creator = e.app.findRecordById("users", e.record.getString("created_by"))
      e.record.set("country", creator.getString("country"))
    } catch (_) { /* no creator: leave empty */ }
  }
  e.next()
}, "lists")

onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    for (const key of Object.keys(e.requestInfo().body || {})) {
      const field = key.replace(/[+-]$/, "").replace(/^[+-]/, "")
      if (field === "active_members" || field === "owners") {
        throw new ForbiddenError(`'${field}' is managed by the server`)
      }
    }
  }
  e.next()
}, "lists")

onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth() && "is_admin" in (e.requestInfo().body || {})) {
    throw new ForbiddenError("'is_admin' can only be set from the dashboard")
  }
  e.next()
}, "users")

onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth() && "is_admin" in (e.requestInfo().body || {})) {
    throw new ForbiddenError("'is_admin' can only be set from the dashboard")
  }
  e.next()
}, "users")

// ── A new list gets its creator as active owner ────────────────────────────

onRecordAfterCreateSuccess((e) => {
  const creator = e.record.getString("created_by")
  if (creator) {
    try {
      const member = new Record(e.app.findCollectionByNameOrId("list_members"))
      member.set("list_id", e.record.id)
      member.set("user_id", creator)
      member.set("role", "owner")
      member.set("status", "active")
      e.app.save(member) // → list_members hook syncs active_members / owners
    } catch (err) {
      console.error(`[babelcart/lists] could not add owner ${creator} to list ${e.record.id}:`, err)
    }
  }
  e.next()
}, "lists")

// ── list_members → lists.active_members / lists.owners ─────────────────────

onRecordAfterCreateSuccess((e) => {
  const { syncListMembers } = require(`${__hooks}/lib/members.js`)
  try {
    syncListMembers(e.app, e.record.getString("list_id"))
  } catch (err) {
    console.error("[babelcart/list_members] sync after create failed:", err)
  }
  e.next()
}, "list_members")

onRecordAfterUpdateSuccess((e) => {
  const { syncListMembers } = require(`${__hooks}/lib/members.js`)
  try {
    syncListMembers(e.app, e.record.getString("list_id"))
  } catch (err) {
    console.error("[babelcart/list_members] sync after update failed:", err)
  }
  e.next()
}, "list_members")

onRecordAfterDeleteSuccess((e) => {
  const { syncListMembers } = require(`${__hooks}/lib/members.js`)
  try {
    syncListMembers(e.app, e.record.getString("list_id"))
  } catch (err) {
    console.error("[babelcart/list_members] sync after delete failed:", err)
  }
  e.next()
}, "list_members")
