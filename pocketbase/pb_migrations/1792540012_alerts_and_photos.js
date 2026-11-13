/// <reference path="../pb_data/types.d.ts" />

// · Login alert emails off (users and superusers): the server has no mail
//   set up, so every sign-in from a new device only logged
//   "Failed to send login alert". Turn back on once SMTP is configured.
// · item_photos.uploaded_by no longer cascades: deleting an account used to
//   delete the photos it uploaded, also those shown in other members' lists
//   and purchases. The photo now stays, with no uploader.
// No rules change; no data is deleted.

migrate((app) => {
  for (const name of ["users", "_superusers"]) {
    const c = app.findCollectionByNameOrId(name);
    c.authAlert.enabled = false;
    app.save(c);
  }
  const photos = app.findCollectionByNameOrId("item_photos");
  const by = photos.fields.getByName("uploaded_by");
  by.cascadeDelete = false;
  by.required = false;
  app.save(photos);
}, (app) => {
  for (const name of ["users", "_superusers"]) {
    const c = app.findCollectionByNameOrId(name);
    c.authAlert.enabled = true;
    app.save(c);
  }
  const photos = app.findCollectionByNameOrId("item_photos");
  const by = photos.fields.getByName("uploaded_by");
  by.cascadeDelete = true;
  by.required = true;
  app.save(photos);
});
