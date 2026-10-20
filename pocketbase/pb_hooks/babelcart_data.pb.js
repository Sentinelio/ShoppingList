/// <reference path="../pb_data/types.d.ts" />

// BabelCart — data hooks: column defaults and the product price book
// (replaces the triggers of supabase migration 018).

// ── Defaults Postgres used to apply ────────────────────────────────────────

onRecordCreate((e) => {
  if (!e.record.getString("category")) e.record.set("category", "other")
  if (e.record.get("translations") == null) e.record.set("translations", {})
  e.next()
}, "items")

onRecordCreate((e) => {
  if (!e.record.getString("currency")) e.record.set("currency", "EUR")
  e.next()
}, "item_prices", "receipts", "product_prices")

onRecordCreate((e) => {
  if (!e.record.getString("emoji")) e.record.set("emoji", "💬")
  e.next()
}, "store_phrases")

// ── item_prices → product_prices (trg_mirror_item_price) ───────────────────
// Only priced rows are mirrored. A price of 0 means "no price" (a purchase
// logged by ticking the item), the equivalent of NULL in Postgres.

onRecordAfterCreateSuccess((e) => {
  const { computeProductKey } = require(`${__hooks}/lib/products.js`)
  const price = e.record.getFloat("price_value")
  if (price) {
    try {
      const item = e.app.findRecordById("items", e.record.getString("item_id"))
      const name = item.getString("original")
      const brand = item.getString("brand").trim()
      if (name.trim().length > 0) {
        const row = new Record(e.app.findCollectionByNameOrId("product_prices"))
        row.set("product_key", computeProductKey(name, brand))
        row.set("product_name", name)
        row.set("brand", brand)
        row.set("store", e.record.getString("store"))
        row.set("price_value", price)
        row.set("currency", e.record.getString("currency") || "EUR")
        row.set("added_by", e.record.getString("added_by"))
        row.set("added_by_name", e.record.getString("added_by_name"))
        row.set("source_item_price_id", e.record.id)
        e.app.save(row)
      }
    } catch (err) {
      console.error(`[babelcart/item_prices] could not mirror ${e.record.id} to product_prices:`, err)
    }
  }
  e.next()
}, "item_prices")

// ── trg_delete_product_prices_for_item_price ───────────────────────────────

onRecordAfterDeleteSuccess((e) => {
  try {
    const rows = e.app.findRecordsByFilter(
      "product_prices",
      "source_item_price_id = {:id}",
      "",
      0,
      0,
      { id: e.record.id },
    )
    for (const row of rows) e.app.delete(row)
  } catch (err) {
    console.error(`[babelcart/item_prices] could not delete product_prices for ${e.record.id}:`, err)
  }
  e.next()
}, "item_prices")
