/// <reference path="../pb_data/types.d.ts" />

// Admin "god mode": admins (users.is_admin) can work in any list — add,
// edit, tick and delete items, prices, comments, history and receipts —
// without being a member. They already could read every list and change
// its settings; now each member condition of these rules also accepts an
// admin. No membership row is created, so nothing in a list shows them.
//
// Additive to the rules: "<member condition>" becomes
// "(<member condition> || @request.auth.is_admin = true)"; the down
// migration puts the exact old text back.

const ADMIN = "@request.auth.is_admin = true";
const TARGETS = [
  ["items", "list_id.active_members.id ?= @request.auth.id"],
  ["receipts", "list_id.active_members.id ?= @request.auth.id"],
  ["item_prices", "item_id.list_id.active_members.id ?= @request.auth.id"],
  ["item_comments", "item_id.list_id.active_members.id ?= @request.auth.id"],
  ["item_history", "item_id.list_id.active_members.id ?= @request.auth.id"],
  ["receipt_items", "receipt_id.list_id.active_members.id ?= @request.auth.id"],
];
const RULES = ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"];

// Replaces the member condition only where it stands on its own (not as the
// tail of a longer path such as "item_id.list_id.active_members…").
function swap(rule, from, to) {
  if (rule == null) return rule;
  let out = "";
  let i = 0;
  for (;;) {
    const j = rule.indexOf(from, i);
    if (j < 0) return out + rule.slice(i);
    const before = j > 0 ? rule[j - 1] : " ";
    const own = before !== "." && before !== "_" && !/[A-Za-z0-9]/.test(before);
    out += rule.slice(i, j) + (own ? to : from);
    i = j + from.length;
  }
}

migrate((app) => {
  for (const [name, member] of TARGETS) {
    const c = app.findCollectionByNameOrId(name);
    for (const r of RULES) c[r] = swap(c[r], member, `(${member} || ${ADMIN})`);
    app.save(c);
  }
}, (app) => {
  for (const [name, member] of TARGETS) {
    const c = app.findCollectionByNameOrId(name);
    for (const r of RULES) c[r] = c[r] == null ? c[r] : c[r].split(`(${member} || ${ADMIN})`).join(member);
    app.save(c);
  }
});
