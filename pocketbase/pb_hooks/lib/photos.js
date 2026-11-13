// Item photos (collection item_photos) that no item and no purchase uses
// any more: deleted once they are older than `days` (a photo just uploaded
// may not be saved into its item yet). Their files go with the record.
function cleanOrphanPhotos(app, days) {
  const cutoff = new Date(Date.now() - days * 864e5).toISOString().replace("T", " ")
  const old = app.findRecordsByFilter("item_photos", "created_at < {:cutoff}", "created_at", 0, 0, { cutoff: cutoff })
  let deleted = 0
  for (const p of old) {
    const id = p.id
    const row = new DynamicModel({ n: 0 })
    app.db()
      .newQuery("SELECT (SELECT count(*) FROM items WHERE photo LIKE {:pat}) + (SELECT count(*) FROM purchases WHERE photo LIKE {:pat}) AS n")
      .bind({ pat: "%/item_photos/" + id + "/%" })
      .one(row)
    if (row.n > 0) continue
    app.delete(p)
    deleted++
  }
  return deleted
}

module.exports = { cleanOrphanPhotos }
