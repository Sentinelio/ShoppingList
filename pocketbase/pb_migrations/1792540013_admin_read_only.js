/// <reference path="../pb_data/types.d.ts" />

// Admin read-only by default: in a list they are not a member of, admins
// (users.is_admin) may still read everything, but they write (add, edit,
// tick, delete items, prices, comments, history, receipts) only after
// turning on users.admin_edit in their profile. Members (admins included)
// keep editing their own lists as before; list settings, members and the
// admin panel's own collections are not touched.
//
// Additive: a new bool field (default false) and, in the write rules only,
// "@request.auth.is_admin = true" becomes
// "(@request.auth.is_admin = true && @request.auth.admin_edit = true)".
// The down migration puts the exact old text back (the field stays).

const ADMIN = "@request.auth.is_admin = true";
const ADMIN_EDIT = "(@request.auth.is_admin = true && @request.auth.admin_edit = true)";
const TARGETS = ["items", "receipts", "item_prices", "item_comments", "item_history", "receipt_items"];
const WRITE_RULES = ["createRule", "updateRule", "deleteRule"];

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users.fields.getByName("admin_edit")) {
    users.fields.add(new BoolField({ name: "admin_edit" }));
    app.save(users);
  }
  for (const name of TARGETS) {
    const c = app.findCollectionByNameOrId(name);
    for (const r of WRITE_RULES) {
      if (c[r] == null || c[r].includes(ADMIN_EDIT)) continue;
      c[r] = c[r].split(ADMIN).join(ADMIN_EDIT);
    }
    app.save(c);
  }
}, (app) => {
  for (const name of TARGETS) {
    const c = app.findCollectionByNameOrId(name);
    for (const r of WRITE_RULES) if (c[r] != null) c[r] = c[r].split(ADMIN_EDIT).join(ADMIN);
    app.save(c);
  }
});
