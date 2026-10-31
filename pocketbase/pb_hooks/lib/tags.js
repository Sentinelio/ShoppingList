// Public user IDs ("K7M-2QX"): six characters without look-alikes.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

function newUniqueTag(app) {
  for (let i = 0; i < 20; i++) {
    const raw = $security.randomStringWithAlphabet(6, ALPHABET)
    const tag = raw.slice(0, 3) + "-" + raw.slice(3)
    try {
      app.findFirstRecordByData("users", "tag", tag)
    } catch (_) {
      return tag // not taken
    }
  }
  throw new Error("could not find a free user tag")
}

module.exports = { newUniqueTag }
