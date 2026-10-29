// "No hay" helpers shared by babelcart_unavailable.pb.js and the routes.

// More than this without checks in a list = a new shopping trip.
const TRIP_GAP_MS = 3 * 60 * 60 * 1000

// PocketBase date format ("2006-01-02 15:04:05.000Z").
function pbDate(d) {
  return d.toISOString().replace("T", " ")
}

function parsePbDate(s) {
  return s ? new Date(String(s).replace(" ", "T")) : null
}

// Puts every "No hay" item matching `filter` back to "to buy".
function release(app, filter, params) {
  const rows = app.findRecordsByFilter("items", "unavailable = true && (" + filter + ")", "", 0, 0, params)
  for (const row of rows) {
    row.set("unavailable", false)
    row.set("unavailable_at", "")
    app.save(row)
  }
  return rows.length
}

function releaseList(app, listId) {
  return release(app, "list_id = {:list}", { list: listId })
}

// "next_day" lists: items marked before today (server local time) go back.
function releaseNextDay(app) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return release(
    app,
    "list_id.unavailable_policy = 'next_day' && unavailable_at != '' && unavailable_at < {:since}",
    { since: pbDate(today) },
  )
}

module.exports = { TRIP_GAP_MS, pbDate, parsePbDate, releaseList, releaseNextDay }
