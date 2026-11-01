/// <reference path="../pb_data/types.d.ts" />

// session_transfers — moves a device's session from one address of the app
// to another (GitHub Pages → the same server that serves the API, which
// browsers don't block when Tailscale is on) without creating a second
// account. The app sends its own saved credentials (random, app-generated)
// with a one-time code; the other address redeems the code within 5
// minutes and gets them back. Rows live minutes and are server-only: every
// rule is null (no API access), only the /api/babelcart/transfer/* routes
// read or write them. Additive: a new collection.

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const transfers = new Collection({
    type: "base",
    name: "session_transfers",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "relation", name: "user", collectionId: users.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "code", required: true },
      { type: "text", name: "email", required: true },
      { type: "text", name: "password", required: true },
      { type: "date", name: "expires_at", required: true },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_session_transfers_code ON session_transfers (code)"],
  });
  app.save(transfers);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("session_transfers"));
});
