// Keeps lists.active_members / lists.owners in sync with list_members.
// Access rules rely on these denormalized fields: a single `?=` on a
// multi-relation is unambiguous, unlike several `?=` conditions on the
// list_members back-relation (which may match different rows).
function syncListMembers(app, listId) {
  if (!listId) return
  let list
  try {
    list = app.findRecordById("lists", listId)
  } catch (_) {
    return // list deleted (e.g. cascade) — nothing to sync
  }
  const rows = app.findRecordsByFilter(
    "list_members",
    "list_id = {:listId} && status = 'active'",
    "joined_at",
    0,
    0,
    { listId: listId },
  )
  const active = []
  const owners = []
  for (const row of rows) {
    const uid = row.getString("user_id")
    if (!uid) continue
    active.push(uid)
    if (row.getString("role") === "owner") owners.push(uid)
  }
  list.set("active_members", active)
  list.set("owners", owners)
  app.save(list)
}

// Fields of a list that are safe to show to someone who is not (yet) an
// active member: no member ids.
function publicList(list) {
  return {
    id: list.id,
    name: list.getString("name"),
    code: list.getString("code"),
    created_by: list.getString("created_by"),
    created_at: list.getString("created_at"),
    require_approval: list.getBool("require_approval"),
    who_can_approve: list.getString("who_can_approve") || "owner",
    who_can_remove: list.getString("who_can_remove") || "owner",
  }
}

function isAdmin(e) {
  if (e.hasSuperuserAuth()) return true
  return !!(e.auth && e.auth.getBool("is_admin"))
}

module.exports = { syncListMembers, publicList, isAdmin }
