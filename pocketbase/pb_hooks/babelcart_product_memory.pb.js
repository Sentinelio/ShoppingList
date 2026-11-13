/// <reference path="../pb_data/types.d.ts" />

// Product memory (migration 1792540011): comments, history and prices are
// tied to the product in its list, set here from their item so clients
// can't attach them to another list. They outlive the item.
// Each handler runs isolated: shared code is loaded with require() inside it.

onRecordCreate((e) => {
  const { productKey } = require(`${__hooks}/lib/purchases.js`)
  const itemId = e.record.getString("item_id")
  if (itemId) {
    try {
      const item = e.app.findRecordById("items", itemId)
      e.record.set("list_id", item.getString("list_id"))
      e.record.set("product_key", productKey(item).key)
    } catch (_) {
      // No such item: the create rule rejects it anyway.
    }
  }
  e.next()
}, "item_comments", "item_history", "item_prices")

// A product added again gets back its last photo and brand (from its
// latest purchase in this list), unless the new one brings its own.
onRecordCreate((e) => {
  const { productKey } = require(`${__hooks}/lib/purchases.js`)
  const needPhoto = !e.record.getString("photo")
  const needBrand = !e.record.getString("brand")
  if (needPhoto || needBrand) {
    try {
      const key = productKey(e.record).key
      const listId = e.record.getString("list_id")
      if (key && listId) {
        const rows = e.app.findRecordsByFilter("purchases", "list_id = {:list} && product_key = {:key} && (photo != '' || brand != '')", "-bought_at", 1, 0, { list: listId, key: key })
        if (rows.length) {
          if (needPhoto && rows[0].getString("photo")) e.record.set("photo", rows[0].getString("photo"))
          if (needBrand && rows[0].getString("brand")) e.record.set("brand", rows[0].getString("brand"))
        }
      }
    } catch (err) {
      console.error("[babelcart/product-memory] could not look up the last photo/brand:", err)
    }
  }
  e.next()
}, "items")

// Once set, the list and product never change (the migration's backfill
// fills them in from empty, which is allowed).
onRecordUpdate((e) => {
  const before = e.record.original()
  if (before.getString("list_id")) e.record.set("list_id", before.getString("list_id"))
  if (before.getString("product_key")) e.record.set("product_key", before.getString("product_key"))
  e.next()
}, "item_comments", "item_history", "item_prices")
