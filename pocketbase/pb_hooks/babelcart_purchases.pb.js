/// <reference path="../pb_data/types.d.ts" />

// BabelCart — purchase log (collection "purchases", migration 1792540008).
// · Ticking an item logs a purchase (who, what, how much, when).
// · Unticking it within 15 minutes undoes that purchase (a mis-tap).
// · A price added for the item fills in the price of its latest purchase.
// · Every hour, lists drop their bought items: "daily" (default) those
//   bought before today, "weekly" those bought before this Monday, "manual"
//   none. The purchases stay in the log.
// Each handler runs isolated: shared code is loaded with require() inside it.

onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const wasChecked = before.getBool("checked")
  e.next()

  const nowChecked = e.record.getBool("checked")
  if (nowChecked === wasChecked) return
  const { logPurchase, undoPurchase } = require(`${__hooks}/lib/purchases.js`)
  try {
    if (nowChecked) logPurchase(e.app, e.record, e.auth ? e.auth.id : "")
    else undoPurchase(e.app, e.record.id)
  } catch (err) {
    console.error(`[babelcart/purchases] could not log item ${e.record.id}:`, err)
  }
}, "items")

onRecordAfterCreateSuccess((e) => {
  const price = e.record.getFloat("price_value")
  if (price) {
    try {
      const rows = e.app.findRecordsByFilter("purchases", "item_id = {:id}", "-bought_at", 1, 0, { id: e.record.getString("item_id") })
      if (rows.length) {
        rows[0].set("price", price)
        rows[0].set("currency", e.record.getString("currency") || "EUR")
        e.app.save(rows[0])
      }
    } catch (err) {
      console.error(`[babelcart/purchases] could not set the price for item ${e.record.getString("item_id")}:`, err)
    }
  }
  e.next()
}, "item_prices")

cronAdd("babelcart_clear_bought", "15 * * * *", () => {
  const { clearBought } = require(`${__hooks}/lib/purchases.js`)
  try {
    const n = clearBought($app, new Date())
    if (n) console.log(`[babelcart/purchases] cleared ${n} bought items`)
  } catch (err) {
    console.error("[babelcart/purchases] clear bought failed:", err)
  }
})
