/// <reference path="../pb_data/types.d.ts" />

// Admin mode: an admin working in a list they are not a member of shows as
// "Admin" (not their name) on what they add — products, prices, comments,
// product history, receipts — and so in the notifications those trigger
// (items_added uses added_by_name). Members, admins included, keep their
// own name. Whether they may write at all is in the rules (migration
// 1792540013: users.admin_edit).

onRecordCreateRequest((e) => {
  const NAME_FIELD = {
    items: "added_by_name",
    item_prices: "added_by_name",
    item_comments: "added_by_name",
    item_history: "by_user_name",
    receipts: "added_by_name",
  }
  try {
    const field = NAME_FIELD[e.record.collection().name]
    if (field && e.auth && e.auth.collection().name === "users" && e.auth.getBool("is_admin")) {
      let listId = e.record.getString("list_id")
      if (!listId && e.record.getString("item_id")) {
        try { listId = e.app.findRecordById("items", e.record.getString("item_id")).getString("list_id") } catch (_) { /* no item */ }
      }
      if (listId) {
        const list = e.app.findRecordById("lists", listId)
        if (list.getStringSlice("active_members").indexOf(e.auth.id) < 0) e.record.set(field, "Admin")
      }
    }
  } catch (err) {
    console.error("[babelcart/admin] could not hide the admin's name:", err)
  }
  e.next()
}, "items", "item_prices", "item_comments", "item_history", "receipts")
