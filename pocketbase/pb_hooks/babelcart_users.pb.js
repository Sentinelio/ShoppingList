/// <reference path="../pb_data/types.d.ts" />

// users.tag: the server gives every new user a public ID and nobody can
// change it afterwards (not even from the dashboard's API), so it can be
// used to tell people with the same name apart.

onRecordCreate((e) => {
  const { newUniqueTag } = require(`${__hooks}/lib/tags.js`)
  e.record.set("tag", newUniqueTag(e.app))
  e.next()
}, "users")

onRecordUpdateRequest((e) => {
  const body = e.requestInfo().body || {}
  for (const key of Object.keys(body)) {
    if (key.replace(/^[+-]|[+-]$/g, "") !== "tag") continue
    if (String(body[key]) !== e.record.original().getString("tag")) {
      throw new ForbiddenError("The user ID can't be changed")
    }
  }
  e.next()
}, "users")
