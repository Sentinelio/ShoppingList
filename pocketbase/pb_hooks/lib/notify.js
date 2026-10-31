// Creates in-app notifications. A notification is a type + params; the app
// turns it into a sentence in its user's language.

// Users can't turn these off.
const MANDATORY = ["admin_message", "inactive_list", "inactive_user"]

// Same group_key, still unread, newer than this → update the existing one
// ("Ana added 5 items" instead of five notifications).
const GROUP_WINDOW_MS = 30 * 60 * 1000

function readJson(record, field) {
  const raw = record.get(field)
  if (raw === null || raw === undefined) return null
  try {
    const parsed = JSON.parse(toString(raw))
    return parsed && typeof parsed === "object" ? parsed : null
  } catch (_) {
    return null
  }
}

function allows(user, type) {
  if (MANDATORY.indexOf(type) >= 0) return true
  const prefs = readJson(user, "notification_prefs")
  return !prefs || prefs[type] !== false
}

// PocketBase stores dates as "2006-01-02 15:04:05.000Z".
function dbDate(ms) {
  return new Date(ms).toISOString().replace("T", " ")
}

// opts: { listId, groupKey, merge(prevParams, params) → params }
function notify(app, userId, type, params, opts) {
  opts = opts || {}
  if (!userId) return
  let user
  try {
    user = app.findRecordById("users", userId)
  } catch (_) {
    return
  }
  if (!allows(user, type)) return

  if (opts.groupKey && opts.merge) {
    let prev = null
    try {
      prev = app.findFirstRecordByFilter(
        "notifications",
        "user = {:u} && group_key = {:g} && read_at = '' && created_at >= {:since}",
        { u: userId, g: opts.groupKey, since: dbDate(Date.now() - GROUP_WINDOW_MS) },
      )
    } catch (_) { /* none to merge into */ }
    if (prev) {
      prev.set("params", opts.merge(readJson(prev, "params") || {}, params))
      app.save(prev)
      return
    }
  }

  const rec = new Record(app.findCollectionByNameOrId("notifications"))
  rec.set("user", userId)
  rec.set("type", type)
  rec.set("params", params || {})
  if (opts.listId) rec.set("list_id", opts.listId)
  if (opts.groupKey) rec.set("group_key", opts.groupKey)
  app.save(rec)
}

function userName(app, userId) {
  try {
    return app.findRecordById("users", userId).getString("name")
  } catch (_) {
    return ""
  }
}

// Members who may approve join requests: owners, or every active member
// when the list says who_can_approve = any_member.
function approvers(list) {
  return list.getString("who_can_approve") === "any_member"
    ? list.getStringSlice("active_members")
    : list.getStringSlice("owners")
}

// A list_members row changed status (before = "" on create): join request
// → approvers; approved / rejected → the requester; joined an open list →
// the other members.
function memberStatusChanged(app, member, before) {
  const status = member.getString("status")
  if (status === before) return
  const listId = member.getString("list_id")
  const uid = member.getString("user_id")
  let list
  try { list = app.findRecordById("lists", listId) } catch (_) { return }
  const listName = list.getString("name")
  const who = userName(app, uid)

  if (status === "pending") {
    for (const a of approvers(list)) {
      if (a !== uid) notify(app, a, "join_request", { list: listName, who: who }, { listId: listId })
    }
  } else if (status === "active" && before === "pending") {
    notify(app, uid, "join_approved", { list: listName }, { listId: listId })
  } else if (status === "active" && before === "" && member.getString("role") !== "owner") {
    // Joined an open list straight away.
    for (const m of list.getStringSlice("active_members")) {
      if (m !== uid) notify(app, m, "member_joined", { list: listName, who: who }, { listId: listId })
    }
  } else if (status === "rejected") {
    notify(app, uid, "join_rejected", { list: listName }, { listId: listId })
  }
}

module.exports = { notify, userName, approvers, memberStatusChanged, readJson, MANDATORY, dbDate }
