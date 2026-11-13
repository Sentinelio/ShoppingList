/// <reference path="../pb_data/types.d.ts" />

// Every Sunday at 04:30: deletes item photos that no item and no purchase
// uses, once they are more than 30 days old (lib/photos.js).
cronAdd("babelcart_orphan_photos", "30 4 * * 0", () => {
  const { cleanOrphanPhotos } = require(`${__hooks}/lib/photos.js`)
  try {
    const n = cleanOrphanPhotos($app, 30)
    if (n) $app.logger().info("orphan item photos deleted", "count", n)
  } catch (err) {
    console.error("[babelcart/photos] orphan cleanup failed:", err)
  }
})
