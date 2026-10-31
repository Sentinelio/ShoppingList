/// <reference path="../pb_data/types.d.ts" />

// users.tag — a short public ID ("K7M-2QX") so people with the same name
// can be told apart: shown in the profile, searchable in the admin. Six
// characters without look-alikes (no 0/O, 1/I/L). Set by the server on
// sign-up (babelcart_users.pb.js) and never changed afterwards.
// Additive: new text field, a tag for every existing user, a unique index.

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new TextField({ name: "tag", max: 7 }));
  app.save(users);

  const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const used = {};
  const records = app.findAllRecords("users");
  for (const r of records) {
    const existing = r.getString("tag");
    if (existing) used[existing] = true;
  }
  for (const r of records) {
    if (r.getString("tag")) continue;
    let tag;
    do {
      const raw = $security.randomStringWithAlphabet(6, ALPHABET);
      tag = raw.slice(0, 3) + "-" + raw.slice(3);
    } while (used[tag]);
    used[tag] = true;
    r.set("tag", tag);
    app.saveNoValidate(r);
  }

  users.addIndex("idx_users_tag", true, "tag", "tag != ''");
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.removeIndex("idx_users_tag");
  users.fields.removeByName("tag");
  app.save(users);
});
