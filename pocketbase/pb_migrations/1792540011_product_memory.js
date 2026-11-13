/// <reference path="../pb_data/types.d.ts" />

// Product memory: comments, history and prices belong to the PRODUCT in a
// list ("Mleko" in "We Need..."), not to one time it was added. The hourly
// clearing of bought items deleted them with the item; now they stay, so a
// note like "not that brand, this one" can be read again months later.
//
// · item_comments / item_history / item_prices get list_id (cascade: they
//   go only with the list) and product_key (the item's English name,
//   lower-cased, like purchases). Both are set by the server from the item
//   (babelcart_product_memory.pb.js), never taken from the client.
// · Their item_id stops being required and stops cascading: when the item
//   goes, the row stays.
// · Read / update / delete rules check the list instead of the item (the
//   item may be gone); create still requires being a member of the item's
//   list (or an admin), as before. Who can see what does not change.
// · purchases get photo and brand, so a product added again gets back its
//   last photo and brand.
// Data: only fields are added and filled in; nothing is deleted.

const TARGETS = ["item_comments", "item_history", "item_prices"];
const NON_CREATE = ["listRule", "viewRule", "updateRule", "deleteRule"];

migrate((app) => {
  const lists = app.findCollectionByNameOrId("lists");
  for (const name of TARGETS) {
    const c = app.findCollectionByNameOrId(name);
    c.fields.add(new RelationField({ name: "list_id", collectionId: lists.id, maxSelect: 1, cascadeDelete: true }));
    c.fields.add(new TextField({ name: "product_key" }));
    const item = c.fields.getByName("item_id");
    item.required = false;
    item.cascadeDelete = false;
    for (const r of NON_CREATE) if (c[r]) c[r] = c[r].split("item_id.list_id.").join("list_id.");
    c.addIndex(`idx_${name}_product`, false, "list_id, product_key", "");
    app.save(c);
  }

  const purchases = app.findCollectionByNameOrId("purchases");
  purchases.fields.add(new TextField({ name: "photo" }));
  purchases.fields.add(new TextField({ name: "brand" }));
  app.save(purchases);

  // ── Backfill from the items that still exist ─────────────────────────
  const keyOf = (item) => {
    let tr = {};
    try { tr = JSON.parse(toString(item.get("translations"))) || {}; } catch (_) { /* none */ }
    return String(tr.en || item.getString("original") || "").trim().toLowerCase();
  };
  for (const name of TARGETS) {
    for (const row of app.findRecordsByFilter(name, "list_id = ''", "", 0, 0)) {
      let item = null;
      try { item = app.findRecordById("items", row.getString("item_id")); } catch (_) { continue; }
      row.set("list_id", item.getString("list_id"));
      row.set("product_key", keyOf(item));
      app.saveNoValidate(row);
    }
  }
  for (const p of app.findRecordsByFilter("purchases", "item_id != ''", "", 0, 0)) {
    let item = null;
    try { item = app.findRecordById("items", p.getString("item_id")); } catch (_) { continue; }
    if (!item.getString("photo") && !item.getString("brand")) continue;
    p.set("photo", item.getString("photo"));
    p.set("brand", item.getString("brand"));
    app.saveNoValidate(p);
  }
}, (app) => {
  for (const name of TARGETS) {
    const c = app.findCollectionByNameOrId(name);
    for (const r of NON_CREATE) if (c[r]) c[r] = c[r].split("(list_id.").join("(item_id.list_id.").split(" list_id.").join(" item_id.list_id.");
    c.removeIndex(`idx_${name}_product`);
    c.fields.removeByName("list_id");
    c.fields.removeByName("product_key");
    const item = c.fields.getByName("item_id");
    item.required = true;
    item.cascadeDelete = true;
    app.save(c);
  }
  const purchases = app.findCollectionByNameOrId("purchases");
  purchases.fields.removeByName("photo");
  purchases.fields.removeByName("brand");
  app.save(purchases);
});
