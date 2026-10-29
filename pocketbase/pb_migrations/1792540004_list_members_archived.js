/// <reference path="../pb_data/types.d.ts" />

// list_members.archived — archiving is personal: the list leaves MY home
// screen, the other members keep seeing it. Lives on my membership row, so
// it goes away with it when I leave. Only written by the server
// (POST /api/babelcart/archive): members can't update their own row under
// the current rules, and approvers must not archive it for someone else
// (guard in babelcart_members.pb.js). Additive, false by default.

migrate((app) => {
  const members = app.findCollectionByNameOrId("list_members");
  members.fields.add(new BoolField({ name: "archived" }));
  app.save(members);
}, (app) => {
  const members = app.findCollectionByNameOrId("list_members");
  members.fields.removeByName("archived");
  app.save(members);
});
