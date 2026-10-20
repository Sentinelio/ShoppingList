/// <reference path="../pb_data/types.d.ts" />

// ============================================================
// BabelCart — full schema (replaces supabase/migrations 001–018 + app_config)
// ============================================================
// Collection and field names match the old Postgres tables so the frontend
// changes as little as possible. Notes on the mapping:
//   · FK → relation field with the same name; cascadeDelete mirrors ON DELETE.
//     ON DELETE SET NULL → non-required relation (PocketBase unsets it).
//   · Columns whose FK was dropped in 014 (added_by on item_* / receipts /
//     product_prices) stay plain text, as in Postgres.
//   · created_at / joined_at / updated_at → autodate; other timestamptz → date.
//   · lists.active_members / lists.owners are denormalized and ONLY written by
//     pb_hooks (see babelcart_members.pb.js). Rules rely on them because
//     several `?=` conditions on a back-relation can match different rows.

migrate((app) => {
  const USERS = "_pb_users_auth_";

  // Shared rule fragments
  const ADMIN = "@request.auth.is_admin = true";
  const AUTHED = '@request.auth.id != ""';
  const LIST_MEMBER = "list_id.active_members.id ?= @request.auth.id";
  const ITEM_MEMBER = "item_id.list_id.active_members.id ?= @request.auth.id";
  const RECEIPT_MEMBER = "receipt_id.list_id.active_members.id ?= @request.auth.id";

  // ── users (auth) ─────────────────────────────────────────
  // The Supabase `users` table merges into the built-in auth collection.
  // `name` already exists there.
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new TextField({ name: "lang", max: 16 }));
  users.fields.add(new TextField({ name: "country", max: 8 }));
  users.fields.add(new TextField({ name: "avatar_color", max: 16 }));
  users.fields.add(new DateField({ name: "last_seen_at" }));
  // New: admin flag. Only settable from the /_/ dashboard (superuser).
  users.fields.add(new BoolField({ name: "is_admin" }));
  users.fields.add(new AutodateField({ name: "created_at", onCreate: true, onUpdate: false }));
  // Each user lists only themselves; any authed user can view a single
  // profile (member avatars). Admins can list everyone for the Admin page.
  users.listRule = `id = @request.auth.id || ${ADMIN}`;
  users.viewRule = AUTHED;
  // Invisible sign-up from the app. is_admin can never come from a client.
  users.createRule = "@request.body.is_admin:isset = false";
  users.updateRule = "id = @request.auth.id && @request.body.is_admin:isset = false";
  users.deleteRule = `id = @request.auth.id || ${ADMIN}`;
  app.save(users);

  // ── lists ────────────────────────────────────────────────
  const NO_DENORM =
    "@request.body.active_members:isset = false && @request.body.owners:isset = false";
  const lists = new Collection({
    type: "base",
    name: "lists",
    listRule: `active_members.id ?= @request.auth.id || ${ADMIN}`,
    viewRule: `active_members.id ?= @request.auth.id || ${ADMIN}`,
    createRule: `${AUTHED} && created_by = @request.auth.id && ${NO_DENORM}`,
    // Any active member can rename; approval/removal settings, the code and
    // the creator are owner-only. Admins may change settings in bulk and
    // transfer ownership (created_by).
    updateRule:
      `${NO_DENORM} && (` +
        `${ADMIN} || (` +
          "active_members.id ?= @request.auth.id" +
          " && @request.body.created_by:isset = false" +
          " && @request.body.code:isset = false" +
          " && ((@request.body.require_approval:isset = false" +
          " && @request.body.who_can_approve:isset = false" +
          " && @request.body.who_can_remove:isset = false)" +
          " || owners.id ?= @request.auth.id)" +
        ")" +
      ")",
    deleteRule: `owners.id ?= @request.auth.id || ${ADMIN}`,
    fields: [
      { type: "text", name: "name", required: true, max: 200 },
      { type: "text", name: "code", required: true, max: 16 },
      { type: "relation", name: "created_by", collectionId: USERS, maxSelect: 1, cascadeDelete: true },
      { type: "bool", name: "require_approval" },
      { type: "select", name: "who_can_approve", values: ["owner", "any_member"], maxSelect: 1 },
      { type: "select", name: "who_can_remove", values: ["owner", "any_member"], maxSelect: 1 },
      // New (denormalized, hook-maintained)
      { type: "relation", name: "active_members", collectionId: USERS, maxSelect: 999 },
      { type: "relation", name: "owners", collectionId: USERS, maxSelect: 999 },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_lists_code ON lists (code)",
      "CREATE INDEX idx_lists_created_by ON lists (created_by)",
    ],
  });
  app.save(lists);

  // ── list_members ─────────────────────────────────────────
  // Rows are created only server-side: /api/babelcart/join and the hook
  // that adds the creator when a list is created (createRule = null).
  const CAN_APPROVE =
    '(list_id.owners.id ?= @request.auth.id || (list_id.who_can_approve = "any_member" && list_id.active_members.id ?= @request.auth.id))';
  const CAN_REMOVE =
    '(list_id.owners.id ?= @request.auth.id || (list_id.who_can_remove = "any_member" && list_id.active_members.id ?= @request.auth.id))';
  const listMembers = new Collection({
    type: "base",
    name: "list_members",
    listRule: `${LIST_MEMBER} || user_id = @request.auth.id || ${ADMIN}`,
    viewRule: `${LIST_MEMBER} || user_id = @request.auth.id || ${ADMIN}`,
    createRule: null,
    // Approve / reject (status) follows who_can_approve (007). Changing a
    // role is owner-only so an approver can't promote themselves.
    updateRule:
      "@request.body.list_id:isset = false && @request.body.user_id:isset = false && (" +
        `${ADMIN} || (` +
          `${CAN_APPROVE} && (@request.body.role:isset = false || list_id.owners.id ?= @request.auth.id)` +
        ")" +
      ")",
    // Leave / cancel own request; reject a pending request (approval rule);
    // remove a member (who_can_remove, 009).
    deleteRule:
      "user_id = @request.auth.id" +
      ` || (status = "pending" && ${CAN_APPROVE})` +
      ` || ${CAN_REMOVE}` +
      ` || ${ADMIN}`,
    fields: [
      { type: "relation", name: "list_id", collectionId: lists.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "relation", name: "user_id", collectionId: USERS, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "select", name: "role", values: ["owner", "member"], maxSelect: 1, required: true },
      { type: "select", name: "status", values: ["active", "pending", "rejected"], maxSelect: 1, required: true },
      { type: "autodate", name: "joined_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_list_members_pair ON list_members (list_id, user_id)",
      "CREATE INDEX idx_list_members_user_id ON list_members (user_id)",
      "CREATE INDEX idx_list_members_list_id_status ON list_members (list_id, status)",
    ],
  });
  app.save(listMembers);

  // ── items ────────────────────────────────────────────────
  const items = new Collection({
    type: "base",
    name: "items",
    listRule: `${LIST_MEMBER} || ${ADMIN}`,
    viewRule: `${LIST_MEMBER} || ${ADMIN}`,
    createRule: `${LIST_MEMBER} && added_by = @request.auth.id`,
    updateRule: `${LIST_MEMBER} && @request.body.list_id:isset = false && @request.body.added_by:isset = false`,
    deleteRule: LIST_MEMBER,
    fields: [
      { type: "relation", name: "list_id", collectionId: lists.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "original", required: true },
      { type: "json", name: "translations" },
      { type: "text", name: "category" },
      { type: "text", name: "qty" },
      { type: "text", name: "unit" },
      { type: "text", name: "note" },
      { type: "text", name: "brand" },
      // New: existed in the frontend but not in the SQL migrations.
      // `photo` keeps the public URL of a file stored in item_photos.
      { type: "text", name: "photo" },
      { type: "bool", name: "important" },
      { type: "bool", name: "checked" },
      { type: "date", name: "checked_at" },
      { type: "relation", name: "added_by", collectionId: USERS, maxSelect: 1, cascadeDelete: false },
      { type: "text", name: "added_by_name" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE INDEX idx_items_list_id ON items (list_id)",
      "CREATE INDEX idx_items_added_by ON items (added_by)",
    ],
  });
  app.save(items);

  // ── item_photos (new) ────────────────────────────────────
  // Replaces the `item-photos` storage bucket. The app uploads a file here
  // and stores its URL in items.photo. Files are public by URL, like the
  // public bucket was; records themselves are only listed by the uploader.
  const itemPhotos = new Collection({
    type: "base",
    name: "item_photos",
    listRule: "uploaded_by = @request.auth.id",
    viewRule: "uploaded_by = @request.auth.id",
    createRule: `${AUTHED} && uploaded_by = @request.auth.id`,
    updateRule: null,
    deleteRule: "uploaded_by = @request.auth.id",
    fields: [
      { type: "file", name: "file", required: true, maxSelect: 1, maxSize: 15 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] },
      { type: "relation", name: "uploaded_by", collectionId: USERS, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
  });
  app.save(itemPhotos);

  // ── dictionary ───────────────────────────────────────────
  const ADMIN_WRITE = ADMIN;
  const dictionary = new Collection({
    type: "base",
    name: "dictionary",
    listRule: "",
    viewRule: "",
    createRule: ADMIN_WRITE,
    updateRule: ADMIN_WRITE,
    deleteRule: ADMIN_WRITE,
    fields: [
      { type: "text", name: "key", required: true },
      { type: "json", name: "translations", required: true },
      { type: "text", name: "category" },
      { type: "text", name: "store_type" },
      { type: "bool", name: "is_brand" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_dictionary_key ON dictionary (`key`)",
      "CREATE INDEX idx_dict_store ON dictionary (store_type)",
      "CREATE INDEX idx_dictionary_category ON dictionary (category)",
      "CREATE INDEX idx_dictionary_is_brand ON dictionary (is_brand)",
    ],
  });
  app.save(dictionary);

  // ── store_phrases ────────────────────────────────────────
  const storePhrases = new Collection({
    type: "base",
    name: "store_phrases",
    listRule: "",
    viewRule: "",
    createRule: ADMIN_WRITE,
    updateRule: ADMIN_WRITE,
    deleteRule: ADMIN_WRITE,
    fields: [
      { type: "text", name: "key", required: true },
      { type: "text", name: "emoji" },
      { type: "json", name: "translations" },
      { type: "number", name: "sort_order", onlyInt: true },
      { type: "number", name: "usage_count", onlyInt: true },
      { type: "date", name: "last_used_at" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated_at", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_store_phrases_key ON store_phrases (`key`)",
      "CREATE INDEX idx_store_phrases_order ON store_phrases (sort_order)",
      "CREATE INDEX idx_store_phrases_usage ON store_phrases (usage_count DESC)",
    ],
  });
  app.save(storePhrases);

  // ── app_config (shape deduced from src/lib/appConfigStore.ts) ──
  const appConfig = new Collection({
    type: "base",
    name: "app_config",
    listRule: "",
    viewRule: "",
    createRule: ADMIN_WRITE,
    updateRule: ADMIN_WRITE,
    deleteRule: ADMIN_WRITE,
    fields: [
      { type: "text", name: "key", required: true },
      { type: "json", name: "value" },
      { type: "autodate", name: "updated_at", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_app_config_key ON app_config (`key`)"],
  });
  app.save(appConfig);

  // ── item_prices ──────────────────────────────────────────
  // price_value / store may be empty: a purchase logged by ticking the item
  // without entering a price (012). PocketBase stores 0 / "" for those.
  const itemPrices = new Collection({
    type: "base",
    name: "item_prices",
    listRule: ITEM_MEMBER,
    viewRule: ITEM_MEMBER,
    createRule: ITEM_MEMBER,
    updateRule: `${ITEM_MEMBER} && @request.body.item_id:isset = false`,
    deleteRule: ITEM_MEMBER,
    fields: [
      { type: "relation", name: "item_id", collectionId: items.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "store" },
      { type: "number", name: "price_value" },
      { type: "text", name: "currency" },
      { type: "text", name: "added_by" },
      { type: "text", name: "added_by_name" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_item_prices_item_id ON item_prices (item_id)"],
  });
  app.save(itemPrices);

  // ── item_comments ────────────────────────────────────────
  const itemComments = new Collection({
    type: "base",
    name: "item_comments",
    listRule: ITEM_MEMBER,
    viewRule: ITEM_MEMBER,
    createRule: `${ITEM_MEMBER} && added_by = @request.auth.id`,
    updateRule: `${ITEM_MEMBER} && added_by = @request.auth.id && @request.body.item_id:isset = false && @request.body.added_by:isset = false`,
    deleteRule: `${ITEM_MEMBER} && (added_by = @request.auth.id || item_id.list_id.owners.id ?= @request.auth.id)`,
    fields: [
      { type: "relation", name: "item_id", collectionId: items.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "text", required: true },
      { type: "text", name: "added_by" },
      { type: "text", name: "added_by_name" },
      { type: "text", name: "added_by_lang" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_item_comments_item_id ON item_comments (item_id)"],
  });
  app.save(itemComments);

  // ── item_history ─────────────────────────────────────────
  const itemHistory = new Collection({
    type: "base",
    name: "item_history",
    listRule: ITEM_MEMBER,
    viewRule: ITEM_MEMBER,
    createRule: ITEM_MEMBER,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "relation", name: "item_id", collectionId: items.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "event_type", required: true },
      { type: "text", name: "description", required: true },
      { type: "text", name: "icon" },
      { type: "text", name: "by_user_id" },
      { type: "text", name: "by_user_name" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE INDEX idx_item_history_item_id ON item_history (item_id)"],
  });
  app.save(itemHistory);

  // ── receipts ─────────────────────────────────────────────
  // The `receipt-photos` bucket becomes the `photo` file field.
  const receipts = new Collection({
    type: "base",
    name: "receipts",
    listRule: LIST_MEMBER,
    viewRule: LIST_MEMBER,
    createRule: LIST_MEMBER,
    updateRule: `${LIST_MEMBER} && @request.body.list_id:isset = false`,
    deleteRule: LIST_MEMBER,
    fields: [
      { type: "relation", name: "list_id", collectionId: lists.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "text", name: "store" },
      { type: "text", name: "store_address" },
      { type: "text", name: "nip" },
      { type: "date", name: "receipt_date" },
      { type: "text", name: "currency" },
      { type: "number", name: "total" },
      { type: "file", name: "photo", maxSelect: 1, maxSize: 15 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] },
      { type: "json", name: "raw_json", maxSize: 2 * 1024 * 1024 },
      { type: "text", name: "added_by" },
      { type: "text", name: "added_by_name" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE INDEX idx_receipts_list_id ON receipts (list_id)",
      "CREATE INDEX idx_receipts_date ON receipts (receipt_date DESC)",
      "CREATE INDEX idx_receipts_store ON receipts (store)",
    ],
  });
  app.save(receipts);

  // ── receipt_items ────────────────────────────────────────
  const receiptItems = new Collection({
    type: "base",
    name: "receipt_items",
    listRule: RECEIPT_MEMBER,
    viewRule: RECEIPT_MEMBER,
    createRule: `${RECEIPT_MEMBER} && (matched_item_id = "" || matched_item_id.list_id = receipt_id.list_id)`,
    updateRule: `${RECEIPT_MEMBER} && @request.body.receipt_id:isset = false`,
    deleteRule: RECEIPT_MEMBER,
    fields: [
      { type: "relation", name: "receipt_id", collectionId: receipts.id, maxSelect: 1, required: true, cascadeDelete: true },
      { type: "relation", name: "matched_item_id", collectionId: items.id, maxSelect: 1, cascadeDelete: false },
      { type: "text", name: "raw_name", required: true },
      { type: "text", name: "expanded_name" },
      { type: "text", name: "brand" },
      { type: "number", name: "qty" },
      { type: "text", name: "unit" },
      { type: "number", name: "unit_price" },
      { type: "number", name: "total_price" },
      { type: "number", name: "discount" },
      { type: "text", name: "tax_category" },
      { type: "text", name: "confidence" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE INDEX idx_receipt_items_receipt_id ON receipt_items (receipt_id)",
      "CREATE INDEX idx_receipt_items_matched ON receipt_items (matched_item_id)",
    ],
  });
  app.save(receiptItems);

  // ── product_prices (018) ─────────────────────────────────
  // Global price book. Rows are written only by the item_prices hooks.
  const productPrices = new Collection({
    type: "base",
    name: "product_prices",
    listRule: AUTHED,
    viewRule: AUTHED,
    createRule: null,
    updateRule: null,
    deleteRule: "added_by = @request.auth.id",
    fields: [
      { type: "text", name: "product_key", required: true },
      { type: "text", name: "product_name", required: true },
      { type: "text", name: "brand" },
      { type: "text", name: "store" },
      { type: "number", name: "price_value", required: true },
      { type: "text", name: "currency" },
      { type: "text", name: "added_by" },
      { type: "text", name: "added_by_name" },
      { type: "text", name: "source_item_price_id" },
      { type: "autodate", name: "created_at", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE INDEX idx_product_prices_key ON product_prices (product_key)",
      "CREATE INDEX idx_product_prices_source ON product_prices (source_item_price_id)",
    ],
  });
  app.save(productPrices);
}, (app) => {
  const names = [
    "product_prices", "receipt_items", "receipts", "item_history", "item_comments",
    "item_prices", "app_config", "store_phrases", "dictionary", "item_photos",
    "items", "list_members", "lists",
  ];
  for (const name of names) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* already gone */ }
  }
  const users = app.findCollectionByNameOrId("users");
  for (const f of ["lang", "country", "avatar_color", "last_seen_at", "is_admin", "created_at"]) {
    users.fields.removeByName(f);
  }
  app.save(users);
});
