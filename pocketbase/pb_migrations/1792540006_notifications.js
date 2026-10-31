/// <reference path="../pb_data/types.d.ts" />

// In-app notifications. A row stores the TYPE and its parameters, not a
// sentence: each app renders it in its user's language. Created only by the
// server (hooks, the admin's /api/babelcart/notify); a user can read, mark
// as read (read_at only) and delete their own.
// users.notification_prefs: { <type>: false } turns a type off; some types
// (admin messages, inactivity warnings) can't be turned off.
// Additive: a new collection and a new JSON field.

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new JSONField({ name: "notification_prefs" }));
  app.save(users);

  const OWN = "user = @request.auth.id";
  const notifications = new Collection({
    type: "base",
    name: "notifications",
    listRule: OWN,
    viewRule: OWN,
    createRule: null,
    updateRule:
      OWN +
      " && @request.body.user:isset = false && @request.body.type:isset = false" +
      " && @request.body.params:isset = false && @request.body.list_id:isset = false" +
      " && @request.body.group_key:isset = false",
    deleteRule: OWN,
    fields: [
      { type: "relation", name: "user", collectionId: users.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "type", required: true },
      { type: "json", name: "params" },
      // Plain text, not a relation: a "list deleted" notice outlives its list.
      { type: "text", name: "list_id" },
      { type: "text", name: "group_key" },
      { type: "date", name: "read_at" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated_at", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_notifications_user_created ON notifications (user, created_at)",
      "CREATE INDEX idx_notifications_group ON notifications (user, group_key)",
    ],
  });
  app.save(notifications);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("notifications"));
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("notification_prefs");
  app.save(users);
});
