// Purchase log helpers shared by babelcart_purchases.pb.js and the routes.

const UNDO_MS = 15 * 60 * 1000

function pbDate(d) {
  return d.toISOString().replace("T", " ")
}

// The product, the same for every list: its English name, lower-cased.
function productKey(record) {
  let tr = {}
  try { tr = JSON.parse(toString(record.get("translations"))) || {} } catch (_) { /* none */ }
  return { tr, key: String(tr.en || record.getString("original") || "").trim().toLowerCase() }
}

function logPurchase(app, item, userId) {
  const { tr, key } = productKey(item)
  if (!key) return
  const buyer = userId || item.getString("added_by")
  if (!buyer) return
  const row = new Record(app.findCollectionByNameOrId("purchases"))
  row.set("list_id", item.getString("list_id"))
  row.set("user_id", buyer)
  row.set("item_id", item.id)
  row.set("product_key", key)
  row.set("original", item.getString("original"))
  row.set("translations", tr)
  row.set("category", item.getString("category") || "other")
  row.set("qty", item.getString("qty"))
  row.set("unit", item.getString("unit"))
  // Remembered for the next time the product is added (migration 1792540011).
  row.set("photo", item.getString("photo"))
  row.set("brand", item.getString("brand"))
  row.set("bought_at", item.getString("checked_at") || pbDate(new Date()))
  app.save(row)
}

// Unticked right after ticking: it wasn't bought.
function undoPurchase(app, itemId) {
  const since = pbDate(new Date(Date.now() - UNDO_MS))
  const rows = app.findRecordsByFilter("purchases", "item_id = {:id} && created_at >= {:since}", "-created_at", 1, 0, { id: itemId, since: since })
  for (const r of rows) app.delete(r)
}

// Bought items leave their list (they stay in the purchase log).
function clearBought(app, now) {
  const today = new Date(now.getTime())
  today.setHours(0, 0, 0, 0)
  const monday = new Date(today.getTime())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  let n = 0
  const sweep = (filter, since) => {
    const rows = app.findRecordsByFilter("items", "checked = true && checked_at != '' && checked_at < {:since} && (" + filter + ")", "", 0, 0, { since: pbDate(since) })
    for (const r of rows) {
      app.delete(r)
      n++
    }
  }
  sweep("list_id.clear_bought = '' || list_id.clear_bought = 'daily'", today)
  sweep("list_id.clear_bought = 'weekly'", monday)
  return n
}

module.exports = { logPurchase, undoPurchase, clearBought, productKey }
