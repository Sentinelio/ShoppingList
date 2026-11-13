/// <reference path="../pb_data/types.d.ts" />

// purchases — a durable log of what was bought: one row each time an item is
// ticked. Items (and their history) are deleted when a list clears its
// bought items; this log stays, so statistics, "most bought" and the order
// of categories survive. Written only by the server (babelcart_purchases.pb.js).
//
// lists.clear_bought — when bought items leave the list: "daily" (default,
// also when empty), "weekly" or "manual".
//
// Additive: a new collection and a new field; the backfill only creates
// purchase rows from what the items already record (history "purchased"
// events, and ticked items without one). Nothing existing is changed.

migrate((app) => {
  const USERS = "_pb_users_auth_";
  const ADMIN = "@request.auth.is_admin = true";
  const lists = app.findCollectionByNameOrId("lists");

  const purchases = new Collection({
    type: "base",
    name: "purchases",
    // Mine, those of lists I'm an active member of, or any for admins.
    listRule: `user_id = @request.auth.id || list_id.active_members.id ?= @request.auth.id || ${ADMIN}`,
    viewRule: `user_id = @request.auth.id || list_id.active_members.id ?= @request.auth.id || ${ADMIN}`,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      // Not required and not cascading: a deleted list leaves its purchases
      // in their buyers' personal statistics.
      { type: "relation", name: "list_id", collectionId: lists.id, maxSelect: 1, cascadeDelete: false },
      { type: "relation", name: "user_id", collectionId: USERS, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "item_id" },
      // The product, the same for every "Mleko" of every list: its English
      // name, lower-cased (else its original name).
      { type: "text", name: "product_key", required: true },
      { type: "text", name: "original" },
      { type: "json", name: "translations" },
      { type: "text", name: "category" },
      { type: "text", name: "qty" },
      { type: "text", name: "unit" },
      { type: "number", name: "price" },
      { type: "text", name: "currency" },
      { type: "date", name: "bought_at", required: true },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE INDEX idx_purchases_list ON purchases (list_id, bought_at)",
      "CREATE INDEX idx_purchases_user ON purchases (user_id, bought_at)",
      "CREATE INDEX idx_purchases_product ON purchases (product_key)",
      "CREATE INDEX idx_purchases_item ON purchases (item_id)",
    ],
  });
  app.save(purchases);

  lists.fields.add(new SelectField({ name: "clear_bought", values: ["daily", "weekly", "manual"], maxSelect: 1 }));
  app.save(lists);

  // ── Backfill ─────────────────────────────────────────────────────────────
  const keyOf = (item) => {
    let tr = {};
    try { tr = JSON.parse(toString(item.get("translations"))) || {}; } catch (_) { /* none */ }
    return { tr, key: String(tr.en || item.getString("original") || "").trim().toLowerCase() };
  };
  const add = (item, userId, when) => {
    const { tr, key } = keyOf(item);
    if (!key || !userId || !when) return false;
    try { app.findRecordById("users", userId); } catch (_) { return false; }
    const row = new Record(purchases);
    row.set("list_id", item.getString("list_id"));
    row.set("user_id", userId);
    row.set("item_id", item.id);
    row.set("product_key", key);
    row.set("original", item.getString("original"));
    row.set("translations", tr);
    row.set("category", item.getString("category") || "other");
    row.set("qty", item.getString("qty"));
    row.set("unit", item.getString("unit"));
    row.set("bought_at", when);
    app.save(row);
    return true;
  };

  const logged = new Set();
  const events = app.findRecordsByFilter("item_history", "event_type = 'purchased'", "created_at", 0, 0);
  for (const ev of events) {
    let item = null;
    try { item = app.findRecordById("items", ev.getString("item_id")); } catch (_) { continue; }
    if (add(item, ev.getString("by_user_id"), ev.getString("created_at"))) logged.add(item.id);
  }
  // Ticked items whose purchase left no history event.
  const ticked = app.findRecordsByFilter("items", "checked = true", "", 0, 0);
  for (const item of ticked) {
    if (logged.has(item.id)) continue;
    add(item, item.getString("added_by"), item.getString("checked_at") || item.getString("created_at"));
  }
}, (app) => {
  const lists = app.findCollectionByNameOrId("lists");
  lists.fields.removeByName("clear_bought");
  app.save(lists);
  app.delete(app.findCollectionByNameOrId("purchases"));
});
