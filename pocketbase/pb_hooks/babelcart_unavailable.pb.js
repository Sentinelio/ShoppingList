/// <reference path="../pb_data/types.d.ts" />

// BabelCart — "No hay" (out of stock) status of items.
// An item is "to buy", "bought" (checked) or "No hay" (unavailable); the
// last two exclude each other. What happens to "No hay" items afterwards
// depends on lists.unavailable_policy (see migration 1792540003).
// Each handler runs isolated: shared code is loaded with require() inside it.

onRecordUpdate((e) => {
  const { TRIP_GAP_MS, pbDate, parsePbDate, releaseList } = require(`${__hooks}/lib/unavailable.js`)
  const before = e.record.original()
  const now = new Date()

  const nowUnavailable = e.record.getBool("unavailable")
  const wasUnavailable = before.getBool("unavailable")
  const nowChecked = e.record.getBool("checked")
  const wasChecked = before.getBool("checked")

  if (nowUnavailable && !wasUnavailable) {
    // Marked "No hay": it's no longer in the cart.
    if (!e.record.getString("unavailable_at")) e.record.set("unavailable_at", pbDate(now))
    e.record.set("checked", false)
    e.record.set("checked_at", "")
  } else if (!nowUnavailable && wasUnavailable) {
    e.record.set("unavailable_at", "")
  }
  const justChecked = e.record.getBool("checked") && nowChecked && !wasChecked
  if (justChecked && nowUnavailable) {
    // Bought after all: leaves "No hay".
    e.record.set("unavailable", false)
    e.record.set("unavailable_at", "")
  }

  e.next()

  // A check after a gap starts a new shopping trip: lists with "next_trip"
  // get their "No hay" items back.
  if (justChecked) {
    try {
      const list = e.app.findRecordById("lists", e.record.getString("list_id"))
      const last = parsePbDate(list.getString("last_checked_at"))
      const newTrip = !last || now.getTime() - last.getTime() > TRIP_GAP_MS
      if (newTrip && list.getString("unavailable_policy") === "next_trip") {
        releaseList(e.app, list.id)
      }
      list.set("last_checked_at", pbDate(now))
      e.app.save(list)
    } catch (err) {
      console.error(`[babelcart/unavailable] trip bookkeeping failed for item ${e.record.id}:`, err)
    }
  }
}, "items")

// "next_day": every hour, release what was marked before today.
cronAdd("babelcart_unavailable_next_day", "5 * * * *", () => {
  const { releaseNextDay } = require(`${__hooks}/lib/unavailable.js`)
  try {
    const n = releaseNextDay($app)
    if (n) console.log(`[babelcart/unavailable] next_day released ${n} item(s)`)
  } catch (err) {
    console.error("[babelcart/unavailable] next_day cron failed:", err)
  }
})

// Superuser-only: run the next_day release now (tests, manual fixes).
routerAdd("POST", "/api/babelcart/release-unavailable", (e) => {
  if (!e.hasSuperuserAuth()) throw new ForbiddenError("Superusers only")
  const { releaseNextDay } = require(`${__hooks}/lib/unavailable.js`)
  return e.json(200, { released: releaseNextDay($app) })
})
