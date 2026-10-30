// BabelCart — PocketBase backend test suite.
//
//   node --experimental-eventsource pocketbase/tests/run.mjs [options]
//   (or: npm run test:pb -- [options])
//
// Options / env:
//   --url <url>          PocketBase URL (env PB_URL, default http://127.0.0.1:8091)
//   --admin-email <e>    superuser email (env PB_ADMIN_EMAIL) — needed to flag a test
//                        user as is_admin. If no password is given, it is asked
//                        for on the terminal without echoing it (recommended).
//   --admin-pass <p>     superuser password (env PB_ADMIN_PASS). Avoid it: npm
//                        prints the full command line, password included.
//   (default)            never reaches Claude: the Claude routes are only checked
//                        for auth (401) and input validation (400). Safe against
//                        the real server, costs no API calls.
//   --dry-run            also check the request each Claude route would send
//                        (model, prompt). Server must run with BABELCART_DRY_RUN=1
//                        (local test instance only).
//   --live               call Claude for real (server must have ANTHROPIC_API_KEY).
//   --receipt <path>     image for the live parse-receipt test (optional)
//   --keep               don't delete the test users/lists at the end
//
// Every run creates its own throwaway users (<uuid>@babelcart.test) and lists,
// so it is safe to repeat against the real server.

import PocketBase from "pocketbase";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

// ── args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const URL_ = arg("url", process.env.PB_URL ?? "http://127.0.0.1:8091");
const ADMIN_EMAIL = arg("admin-email", process.env.PB_ADMIN_EMAIL);
let ADMIN_PASS = arg("admin-pass", process.env.PB_ADMIN_PASS);
const LIVE = flag("live");
const DRY = flag("dry-run");
if (LIVE && DRY) {
  console.error("--live and --dry-run are mutually exclusive");
  process.exit(2);
}
const MODE = LIVE ? "LIVE Claude" : DRY ? "dry run" : "no Claude calls";
const RECEIPT = arg("receipt", undefined);
const KEEP = flag("keep");

if (typeof EventSource === "undefined") {
  console.error("Run with: node --experimental-eventsource pocketbase/tests/run.mjs");
  process.exit(2);
}

// Reads a line from the terminal without echoing it.
function promptHidden(question) {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    console.error("--admin-email without a password needs an interactive terminal (or set PB_ADMIN_PASS).");
    process.exit(2);
  }
  return new Promise((resolve) => {
    process.stdout.write(question);
    let value = "";
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") { // Enter / Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") { // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1); // Backspace
        else value += ch;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
    stdin.resume();
  });
}

// ── tiny test harness ─────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}\n      ${err?.message ?? err}`);
    if (err?.response && Object.keys(err.response).length) {
      console.log(`      ${JSON.stringify(err.response).slice(0, 400)}`);
    }
  }
}
function section(title) { console.log(`\n${title}`); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
async function rejects(promise, statuses, msg) {
  try {
    await promise;
  } catch (err) {
    if (statuses && !statuses.includes(err?.status)) {
      throw new Error(`${msg}: expected status ${statuses.join("/")}, got ${err?.status} (${err?.message})`);
    }
    return err;
  }
  throw new Error(`${msg}: request should have failed but succeeded`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Waits until `pred(events)` holds or times out.
async function waitFor(events, pred, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred(events)) return;
    await sleep(100);
  }
  throw new Error(`timed out waiting for realtime event (got ${events.map((e) => e.action).join(",") || "none"})`);
}

// ── helpers ───────────────────────────────────────────────────────────────
const created = { users: [], lists: [] };

// Same flow as the app: random email + long random password, then auth.
async function newUser(name, lang = "es") {
  const pb = new PocketBase(URL_);
  pb.autoCancellation(false);
  const email = `${randomUUID()}@babelcart.test`;
  const password = randomBytes(24).toString("base64url");
  const rec = await pb.collection("users").create({
    email, password, passwordConfirm: password, name, lang, country: "ES", avatar_color: "#f0883e",
  });
  await pb.collection("users").authWithPassword(email, password);
  created.users.push({ id: rec.id, email, password });
  return { pb, id: rec.id, name };
}

const memberRow = (pb, listId, userId) =>
  pb.collection("list_members").getFirstListItem(pb.filter("list_id = {:l} && user_id = {:u}", { l: listId, u: userId }));

// 1×1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// ── run ───────────────────────────────────────────────────────────────────
console.log(`BabelCart backend tests → ${URL_} (${MODE})`);

const su = new PocketBase(URL_);
su.autoCancellation(false);
if (ADMIN_EMAIL && !ADMIN_PASS) {
  ADMIN_PASS = await promptHidden(`Superuser password for ${ADMIN_EMAIL}: `);
}
if (ADMIN_EMAIL && ADMIN_PASS) {
  await su.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
}

const health = await fetch(`${URL_}/api/health`).then((r) => r.json());
assert(health.code === 200, "server not healthy");

const A = await newUser("Ana (owner)");
const B = await newUser("Bea (member)");
const C = await newUser("Carlos (outsider)");
const D = await newUser("Dani (pending)");

let list, item;

section("Users & admin flag");
await test("each user lists only themselves", async () => {
  const rows = await A.pb.collection("users").getFullList();
  eq(rows.map((r) => r.id), [A.id], "users list");
});
await test("any authed user can view a single profile", async () => {
  const b = await A.pb.collection("users").getOne(B.id);
  eq(b.name, B.name, "profile name");
});
await test("user can update own profile fields", async () => {
  const r = await A.pb.collection("users").update(A.id, { lang: "pl", last_seen_at: new Date().toISOString() });
  eq(r.lang, "pl", "lang");
});
await test("self-promotion to admin (update is_admin) is rejected", async () => {
  await rejects(A.pb.collection("users").update(A.id, { is_admin: true }), [400, 403, 404], "update is_admin");
  const me = await A.pb.collection("users").getOne(A.id);
  eq(me.is_admin, false, "is_admin after attempt");
});
await test("sign-up with is_admin=true is rejected", async () => {
  const pb = new PocketBase(URL_);
  const email = `${randomUUID()}@babelcart.test`;
  await rejects(
    pb.collection("users").create({ email, password: "x".repeat(20), passwordConfirm: "x".repeat(20), is_admin: true }),
    [400, 403],
    "create is_admin",
  );
});
await test("user cannot edit another user's profile", async () => {
  await rejects(A.pb.collection("users").update(B.id, { name: "hacked" }), [400, 403, 404], "update other");
});

section("Lists & membership");
await test("create list → creator becomes active owner (hook)", async () => {
  list = await A.pb.collection("lists").create({ name: "Test list", code: randomBytes(4).toString("hex").toUpperCase().slice(0, 6), created_by: A.id });
  created.lists.push(list.id);
  const fresh = await A.pb.collection("lists").getOne(list.id);
  eq(fresh.active_members, [A.id], "active_members");
  eq(fresh.owners, [A.id], "owners");
  eq(fresh.require_approval, true, "require_approval default");
  eq(fresh.who_can_approve, "owner", "who_can_approve default");
  eq(fresh.country, "ES", "country defaults to the creator's");
  const row = await memberRow(A.pb, list.id, A.id);
  eq([row.role, row.status], ["owner", "active"], "owner row");
});
await test("list country can be set on create and changed by a member", async () => {
  const l = await A.pb.collection("lists").create({ name: "PL list", code: "PL" + randomBytes(2).toString("hex").toUpperCase(), created_by: A.id, country: "PL" });
  try {
    eq(l.country, "PL", "explicit country");
    const r = await A.pb.collection("lists").update(l.id, { country: "DE" });
    eq(r.country, "DE", "updated country");
  } finally {
    await A.pb.collection("lists").delete(l.id); // keep created.lists indexes stable
  }
});
await test("create list with active_members in body is rejected", async () => {
  await rejects(
    A.pb.collection("lists").create({ name: "x", code: "ZZ" + randomBytes(2).toString("hex"), created_by: A.id, active_members: [A.id, C.id] }),
    [400, 403],
    "create with active_members",
  );
});
await test("create list on behalf of another user is rejected", async () => {
  await rejects(A.pb.collection("lists").create({ name: "x", code: "YY" + randomBytes(2).toString("hex"), created_by: B.id }), [400], "created_by other");
});
await test("owner cannot write active_members/owners directly", async () => {
  await rejects(A.pb.collection("lists").update(list.id, { active_members: [A.id, C.id] }), [400, 403, 404], "owner sets active_members");
  await rejects(A.pb.collection("lists").update(list.id, { "owners+": C.id }), [400, 403, 404], "owner adds owner");
});
await test("non-member cannot see the list", async () => {
  await rejects(C.pb.collection("lists").getOne(list.id), [404], "view list");
  const all = await C.pb.collection("lists").getFullList();
  assert(!all.some((l) => l.id === list.id), "list visible in listing");
});
await test("non-member cannot add themselves to active_members", async () => {
  await rejects(C.pb.collection("lists").update(list.id, { "active_members+": C.id }), [400, 403, 404], "active_members+");
  await rejects(C.pb.collection("lists").update(list.id, { active_members: [C.id] }), [400, 403, 404], "active_members=");
  const fresh = await A.pb.collection("lists").getOne(list.id);
  assert(!fresh.active_members.includes(C.id), "C ended up in active_members");
});
await test("non-member cannot create an active list_members row", async () => {
  await rejects(
    C.pb.collection("list_members").create({ list_id: list.id, user_id: C.id, role: "member", status: "active" }),
    [400, 403],
    "create list_members",
  );
  await rejects(
    C.pb.collection("list_members").create({ list_id: list.id, user_id: C.id, role: "member", status: "pending" }),
    [400, 403],
    "create pending list_members",
  );
});
await test("owner cannot create list_members rows either (server-only)", async () => {
  await rejects(
    A.pb.collection("list_members").create({ list_id: list.id, user_id: C.id, role: "member", status: "active" }),
    [400, 403],
    "owner create list_members",
  );
});

section("Join by code (with approval)");
await test("join with a wrong code → 404", async () => {
  await rejects(B.pb.send("/api/babelcart/join", { method: "POST", body: { code: "NOPE00" } }), [404], "bad code");
});
await test("join requires auth", async () => {
  const anon = new PocketBase(URL_);
  await rejects(anon.send("/api/babelcart/join", { method: "POST", body: { code: list.code } }), [401], "anon join");
});
await test("B joins → pending, sees request, can't read items", async () => {
  const res = await B.pb.send("/api/babelcart/join", { method: "POST", body: { code: list.code.toLowerCase() } });
  eq(res.status, "pending", "status");
  eq(res.list.id, list.id, "list id");
  assert(!("active_members" in res.list), "join response leaks member ids");
  const reqs = await B.pb.send("/api/babelcart/my-requests", { method: "GET" });
  eq(reqs.map((r) => [r.list_id, r.list_name]), [[list.id, "Test list"]], "my-requests");
  await rejects(B.pb.collection("lists").getOne(list.id), [404], "pending sees list");
  const fresh = await A.pb.collection("lists").getOne(list.id);
  assert(!fresh.active_members.includes(B.id), "pending in active_members");
});
await test("joining twice keeps a single pending row", async () => {
  const res = await B.pb.send("/api/babelcart/join", { method: "POST", body: { code: list.code } });
  eq(res.status, "pending", "status");
  const rows = await A.pb.collection("list_members").getFullList({ filter: A.pb.filter("list_id = {:l}", { l: list.id }) });
  eq(rows.length, 2, "member rows");
});
await test("pending user cannot approve themselves", async () => {
  const row = await memberRow(B.pb, list.id, B.id);
  await rejects(B.pb.collection("list_members").update(row.id, { status: "active" }), [400, 403, 404], "self-approve");
});
await test("owner approves B → B in active_members", async () => {
  const row = await memberRow(A.pb, list.id, B.id);
  await A.pb.collection("list_members").update(row.id, { status: "active" });
  const fresh = await B.pb.collection("lists").getOne(list.id);
  assert(fresh.active_members.includes(B.id), "B not active");
  assert(!fresh.owners.includes(B.id), "B became owner");
});

section("Approval / removal settings (007–009)");
await test("member (non-owner) can rename but not change settings", async () => {
  await B.pb.collection("lists").update(list.id, { name: "Renamed by B" });
  await rejects(B.pb.collection("lists").update(list.id, { require_approval: false }), [400, 403, 404], "member changes settings");
  await rejects(B.pb.collection("lists").update(list.id, { code: "HACKED" }), [400, 403, 404], "member changes code");
});
await test("D joins → pending; member B can't approve while who_can_approve=owner", async () => {
  const res = await D.pb.send("/api/babelcart/join", { method: "POST", body: { code: list.code } });
  eq(res.status, "pending", "status");
  const row = await memberRow(B.pb, list.id, D.id);
  await rejects(B.pb.collection("list_members").update(row.id, { status: "active" }), [400, 403, 404], "member approves");
});
await test("who_can_approve=any_member → B approves D", async () => {
  await A.pb.collection("lists").update(list.id, { who_can_approve: "any_member" });
  const row = await memberRow(B.pb, list.id, D.id);
  await B.pb.collection("list_members").update(row.id, { status: "active" });
  const fresh = await A.pb.collection("lists").getOne(list.id);
  assert(fresh.active_members.includes(D.id), "D not active");
});
await test("approver can't promote themselves to owner", async () => {
  const row = await memberRow(B.pb, list.id, B.id);
  await rejects(B.pb.collection("list_members").update(row.id, { role: "owner" }), [400, 403, 404], "self-promote");
});
await test("member B can't remove D while who_can_remove=owner", async () => {
  const row = await memberRow(B.pb, list.id, D.id);
  await rejects(B.pb.collection("list_members").delete(row.id), [400, 403, 404], "member removes");
});
await test("who_can_remove=any_member → B removes D → D loses access", async () => {
  await A.pb.collection("lists").update(list.id, { who_can_remove: "any_member" });
  const row = await memberRow(B.pb, list.id, D.id);
  await B.pb.collection("list_members").delete(row.id);
  await rejects(D.pb.collection("lists").getOne(list.id), [404], "D still sees list");
});
await test("require_approval=false → C joins directly as active", async () => {
  await A.pb.collection("lists").update(list.id, { require_approval: false });
  const res = await C.pb.send("/api/babelcart/join", { method: "POST", body: { code: list.code } });
  eq(res.status, "active", "status");
  const fresh = await C.pb.collection("lists").getOne(list.id);
  assert(fresh.active_members.includes(C.id), "C not active");
});
await test("C leaves (deletes own row) → loses access", async () => {
  const row = await memberRow(C.pb, list.id, C.id);
  await C.pb.collection("list_members").delete(row.id);
  await rejects(C.pb.collection("lists").getOne(list.id), [404], "C still sees list");
  await A.pb.collection("lists").update(list.id, { require_approval: true, who_can_approve: "owner", who_can_remove: "owner" });
});

section("Items, realtime, prices, comments, history");
const bEvents = [];
let unsubB = null;
await test("B subscribes to items of the list (realtime)", async () => {
  unsubB = await B.pb.collection("items").subscribe("*", (e) => bEvents.push(e), {
    filter: B.pb.filter("list_id = {:l}", { l: list.id }),
  });
});
const cEvents = [];
const unsubC = await C.pb.collection("items").subscribe("*", (e) => cEvents.push(e));
await test("A adds an item with translations → B gets it in realtime", async () => {
  item = await A.pb.collection("items").create({
    list_id: list.id, original: "leche", translations: { es: "leche", en: "milk", pl: "mleko" },
    category: "dairy", qty: "2", unit: "l", note: "", brand: "", checked: false,
    added_by: A.id, added_by_name: A.name,
  });
  await waitFor(bEvents, (ev) => ev.some((e) => e.action === "create" && e.record.id === item.id));
});
await test("item cannot be added on behalf of another user", async () => {
  await rejects(
    A.pb.collection("items").create({ list_id: list.id, original: "x", added_by: B.id }),
    [400],
    "added_by other",
  );
});
await test("B checks the item → realtime update", async () => {
  await B.pb.collection("items").update(item.id, { checked: true, checked_at: new Date().toISOString() });
  await waitFor(bEvents, (ev) => ev.some((e) => e.action === "update" && e.record.checked === true));
});
await test("item cannot be moved to another list", async () => {
  const other = await B.pb.collection("lists").create({ name: "B's", code: "B" + randomBytes(3).toString("hex").toUpperCase(), created_by: B.id });
  created.lists.push(other.id);
  await rejects(B.pb.collection("items").update(item.id, { list_id: other.id }), [400, 403, 404], "move item");
});
await test("non-member C can't read the item even knowing its id", async () => {
  await rejects(C.pb.collection("items").getOne(item.id), [404], "getOne");
  const rows = await C.pb.collection("items").getFullList({ filter: C.pb.filter("list_id = {:l}", { l: list.id }) });
  eq(rows.length, 0, "filtered list");
  await rejects(C.pb.collection("items").update(item.id, { original: "hacked" }), [400, 403, 404], "update");
  await rejects(C.pb.collection("items").delete(item.id), [400, 403, 404], "delete");
  await rejects(
    C.pb.collection("items").create({ list_id: list.id, original: "spam", added_by: C.id }),
    [400, 403],
    "create in foreign list",
  );
});
await test("non-member C got no realtime events for the list", async () => {
  await sleep(300);
  eq(cEvents.length, 0, "C events");
});
let price;
await test("B adds a price → mirrored into product_prices (hook)", async () => {
  price = await B.pb.collection("item_prices").create({
    item_id: item.id, store: "Lidl", price_value: 1.29, currency: "EUR", added_by: B.id, added_by_name: B.name,
  });
  const rows = await A.pb.collection("product_prices").getFullList({ filter: A.pb.filter("source_item_price_id = {:id}", { id: price.id }) });
  eq(rows.length, 1, "product_prices rows");
  eq([rows[0].product_key, rows[0].price_value, rows[0].store], ["leche", 1.29, "Lidl"], "mirrored row");
});
await test("product_prices are readable by any authed user (also outsiders)", async () => {
  const rows = await C.pb.collection("product_prices").getFullList({ filter: C.pb.filter("product_key = 'leche'") });
  assert(rows.some((r) => r.source_item_price_id === price.id), "not visible");
});
await test("product key includes the brand", async () => {
  await A.pb.collection("items").update(item.id, { brand: "  Łaciate  " });
  const p2 = await A.pb.collection("item_prices").create({ item_id: item.id, store: "Biedronka", price_value: 3.49, currency: "PLN", added_by: A.id, added_by_name: A.name });
  const row = await A.pb.collection("product_prices").getFirstListItem(A.pb.filter("source_item_price_id = {:id}", { id: p2.id }));
  eq(row.product_key, "leche|łaciate", "key with brand");
  await A.pb.collection("item_prices").delete(p2.id);
});
await test("a purchase without price is not mirrored", async () => {
  const p0 = await B.pb.collection("item_prices").create({ item_id: item.id, store: "", currency: "EUR", added_by: B.id, added_by_name: B.name });
  const rows = await A.pb.collection("product_prices").getFullList({ filter: A.pb.filter("source_item_price_id = {:id}", { id: p0.id }) });
  eq(rows.length, 0, "rows");
});
await test("clients can't write product_prices directly", async () => {
  await rejects(
    A.pb.collection("product_prices").create({ product_key: "x", product_name: "x", price_value: 1 }),
    [400, 403],
    "create",
  );
});
await test("deleting the price removes the product_prices row (hook)", async () => {
  await B.pb.collection("item_prices").delete(price.id);
  const rows = await A.pb.collection("product_prices").getFullList({ filter: A.pb.filter("source_item_price_id = {:id}", { id: price.id }) });
  eq(rows.length, 0, "rows after delete");
});
await test("non-member can't read or add prices", async () => {
  const rows = await C.pb.collection("item_prices").getFullList({ filter: C.pb.filter("item_id = {:i}", { i: item.id }) });
  eq(rows.length, 0, "rows");
  await rejects(C.pb.collection("item_prices").create({ item_id: item.id, price_value: 9 }), [400, 403], "create");
});
let comment;
await test("comment by B, realtime for A, only author/owner can delete", async () => {
  const aEvents = [];
  const unsub = await A.pb.collection("item_comments").subscribe("*", (e) => aEvents.push(e), {
    filter: A.pb.filter("item_id = {:i}", { i: item.id }),
  });
  comment = await B.pb.collection("item_comments").create({ item_id: item.id, text: "¿la sin lactosa?", added_by: B.id, added_by_name: B.name, added_by_lang: "es" });
  await waitFor(aEvents, (ev) => ev.some((e) => e.action === "create" && e.record.id === comment.id));
  await unsub();
  await rejects(C.pb.collection("item_comments").delete(comment.id), [400, 403, 404], "outsider delete");
  await A.pb.collection("item_comments").delete(comment.id); // owner
});
await test("history events: members add, nobody edits", async () => {
  const h = await A.pb.collection("item_history").create({ item_id: item.id, event_type: "created", description: "added", icon: "➕", by_user_id: A.id, by_user_name: A.name });
  await rejects(A.pb.collection("item_history").update(h.id, { description: "changed" }), [400, 403, 404], "update history");
  const rows = await C.pb.collection("item_history").getFullList({ filter: C.pb.filter("item_id = {:i}", { i: item.id }) });
  eq(rows.length, 0, "outsider history");
});

section("Receipts");
let receipt;
await test("member creates a receipt with a photo file; URL is served", async () => {
  const fd = new FormData();
  fd.append("list_id", list.id);
  fd.append("store", "Lidl");
  fd.append("currency", "EUR");
  fd.append("total", "1.29");
  fd.append("raw_json", JSON.stringify({ store: "Lidl", lines: [] }));
  fd.append("added_by", A.id);
  fd.append("added_by_name", A.name);
  fd.append("photo", new Blob([PNG], { type: "image/png" }), "ticket.png");
  receipt = await A.pb.collection("receipts").create(fd);
  assert(receipt.photo, "photo filename missing");
  const url = A.pb.files.getURL(receipt, receipt.photo);
  const r = await fetch(url);
  eq(r.status, 200, "photo GET status");
});
await test("receipt lines link to items of the same list only", async () => {
  await A.pb.collection("receipt_items").create({ receipt_id: receipt.id, matched_item_id: item.id, raw_name: "MLEKO 2L", qty: 1, total_price: 1.29 });
  const foreignItem = await B.pb.collection("items").create({ list_id: created.lists[1], original: "pan", added_by: B.id });
  await rejects(
    B.pb.collection("receipt_items").create({ receipt_id: receipt.id, matched_item_id: foreignItem.id, raw_name: "X" }),
    [400, 403],
    "cross-list match",
  );
});
await test("non-member can't see receipts or their lines", async () => {
  await rejects(C.pb.collection("receipts").getOne(receipt.id), [404], "receipt");
  const lines = await C.pb.collection("receipt_items").getFullList({ filter: C.pb.filter("receipt_id = {:r}", { r: receipt.id }) });
  eq(lines.length, 0, "lines");
  await rejects(C.pb.collection("receipts").create({ list_id: list.id, store: "x" }), [400, 403], "create");
});

section("Item photos");
await test("upload an item photo and read it by URL", async () => {
  const fd = new FormData();
  fd.append("uploaded_by", A.id);
  fd.append("file", new Blob([PNG], { type: "image/png" }), "milk.png");
  const rec = await A.pb.collection("item_photos").create(fd);
  const r = await fetch(A.pb.files.getURL(rec, rec.file));
  eq(r.status, 200, "photo GET status");
});

section("Public data & admin");
await test("dictionary / store_phrases / app_config are public to read", async () => {
  const anon = new PocketBase(URL_);
  const phrases = await anon.collection("store_phrases").getFullList({ sort: "sort_order" });
  assert(phrases.length >= 6, "seed phrases missing");
  eq(phrases[0].key, "looking", "first phrase");
  await anon.collection("dictionary").getList(1, 1);
  await anon.collection("app_config").getList(1, 1);
});
await test("normal users can't write dictionary / store_phrases / app_config", async () => {
  await rejects(A.pb.collection("dictionary").create({ key: "hack", translations: { en: "hack" } }), [400, 403], "dictionary");
  await rejects(A.pb.collection("store_phrases").create({ key: "hack", translations: {} }), [400, 403], "store_phrases");
  await rejects(A.pb.collection("app_config").create({ key: "themes", value: {} }), [400, 403], "app_config");
});
await test("phrase-used increments usage_count", async () => {
  const before = await A.pb.collection("store_phrases").getFirstListItem("key = 'thanks'");
  await A.pb.send("/api/babelcart/phrase-used", { method: "POST", body: { key: "thanks" } });
  const after = await A.pb.collection("store_phrases").getFirstListItem("key = 'thanks'");
  eq(after.usage_count, before.usage_count + 1, "usage_count");
  assert(after.last_used_at, "last_used_at not set");
  await rejects(A.pb.send("/api/babelcart/phrase-used", { method: "POST", body: { key: "nope" } }), [404], "unknown key");
});
await test("seed-dictionary is admin-only", async () => {
  await rejects(
    A.pb.send("/api/babelcart/seed-dictionary", { method: "POST", body: { count: 3, prompt: "dairy" } }),
    [403],
    "non-admin seed",
  );
});
if (su.authStore.isValid) {
  await test("is_admin (set by superuser) unlocks admin writes", async () => {
    await su.collection("users").update(D.id, { is_admin: true });
    await D.pb.collection("users").authRefresh();
    const k = `test-${randomBytes(3).toString("hex")}`;
    const row = await D.pb.collection("dictionary").create({ key: k, translations: { en: k }, category: "other" });
    await D.pb.collection("dictionary").delete(row.id);
    const all = await D.pb.collection("users").getList(1, 5);
    assert(all.totalItems > 1, "admin should list all users");
  });
  await test("admin can't edit their own is_admin either", async () => {
    await rejects(D.pb.collection("users").update(D.id, { is_admin: false }), [400, 403, 404], "admin self-edit");
  });
  if (DRY) {
    await test("seed-dictionary as admin reaches the Claude call", async () => {
      const r = await D.pb.send("/api/babelcart/seed-dictionary", { method: "POST", body: { count: 3, prompt: "dairy products", mode: "brands" } });
      eq(r.dry_run, true, "dry_run");
      assert(r.request.prompt.includes("brand-name dictionary"), "brands prompt");
    });
    await test("seed-dictionary asks for the languages it is given", async () => {
      const r = await D.pb.send("/api/babelcart/seed-dictionary", { method: "POST", body: { count: 3, prompt: "dairy products", langs: ["es", "nl", "en", "bad code!"] } });
      assert(r.request.prompt.includes("en, es, nl"), "langs in prompt: " + r.request.prompt.slice(0, 300));
      assert(!r.request.prompt.includes("bad code"), "invalid code filtered");
      eq(r.request.max_tokens, 16000, "max_tokens");
    });
  }
} else {
  console.log("  (skipped is_admin tests: pass --admin-email/--admin-pass)");
}

section(LIVE ? "Claude routes (LIVE)" : DRY ? "Claude routes (up to the Claude call)" : "Claude routes (auth + validation only)");
await test("routes require auth", async () => {
  const anon = new PocketBase(URL_);
  for (const p of ["translate", "translate-ui", "parse-receipt", "seed-dictionary", "phrase-used"]) {
    await rejects(anon.send(`/api/babelcart/${p}`, { method: "POST", body: {} }), [401], p);
  }
});
await test("routes validate their input (400)", async () => {
  await rejects(A.pb.send("/api/babelcart/translate", { method: "POST", body: { text: "" } }), [400], "translate");
  await rejects(A.pb.send("/api/babelcart/translate-ui", { method: "POST", body: { strings: {} } }), [400], "translate-ui");
  await rejects(A.pb.send("/api/babelcart/parse-receipt", { method: "POST", body: {} }), [400], "parse-receipt");
});
if (DRY) {
  await test("translate builds the prompt for the translate model", async () => {
    const r = await A.pb.send("/api/babelcart/translate", { method: "POST", body: { text: "lehe", langs: ["es", "pl", "en"] } });
    eq(r.dry_run, true, "dry_run");
    eq(r.request.model, "claude-haiku-5-5", "model");
    assert(r.request.prompt.includes('A user wants to buy: "lehe"') && r.request.prompt.includes("es, pl, en"), "prompt");
  });
  await test("translate-ui builds the prompt for the UI model", async () => {
    const r = await A.pb.send("/api/babelcart/translate-ui", { method: "POST", body: { strings: { hello: "Hello" }, targetLang: "pl", targetLangName: "Polish" } });
    eq(r.request.model, "claude-haiku-5-5", "model");
    assert(r.request.prompt.includes("from English to Polish (pl)"), "prompt");
  });
  await test("parse-receipt prefers imageBase64 and uses the receipt model", async () => {
    const r = await A.pb.send("/api/babelcart/parse-receipt", {
      method: "POST",
      body: { imageBase64: PNG.toString("base64"), mediaType: "image/png", imageUrl: "https://example.com/x.jpg", targetLangs: ["es", "en"] },
    });
    eq(r.request.model, "claude-sonnet-5-5", "model");
    eq(r.request.images, ["base64"], "image source");
    assert(r.request.prompt.includes("Languages: es, en"), "prompt langs");
    const r2 = await A.pb.send("/api/babelcart/parse-receipt", { method: "POST", body: { imageUrl: "https://example.com/x.jpg" } });
    eq(r2.request.images, ["url"], "url source");
  });
} else if (LIVE) {
  await test("translate (live) returns {t,c} and saves to dictionary", async () => {
    const word = "zanahorias";
    const r = await A.pb.send("/api/babelcart/translate", { method: "POST", body: { text: word, langs: ["es", "en", "pl"] } });
    assert(r.t && r.t.en && r.t.pl, `bad translations: ${JSON.stringify(r)}`);
    assert(typeof r.c === "string", "category");
    const row = await A.pb.collection("dictionary").getFirstListItem(A.pb.filter("key = {:k}", { k: word }));
    assert(row.translations.en, "dictionary row missing translation");
    console.log(`      ${word} → ${JSON.stringify(r)}`);
  });
  await test("translate-ui (live)", async () => {
    const r = await A.pb.send("/api/babelcart/translate-ui", { method: "POST", body: { strings: { hello: "Hello", bye: "Goodbye" }, targetLang: "es", targetLangName: "Spanish" } });
    assert(r.translations?.hello && r.translations?.bye, `bad: ${JSON.stringify(r)}`);
    console.log(`      ${JSON.stringify(r.translations)}`);
  });
  if (RECEIPT) {
    await test("parse-receipt (live) with " + RECEIPT, async () => {
      const buf = readFileSync(RECEIPT);
      const ext = extname(RECEIPT).toLowerCase();
      const mediaType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const r = await A.pb.send("/api/babelcart/parse-receipt", { method: "POST", body: { imageBase64: buf.toString("base64"), mediaType, targetLangs: ["es", "en"] } });
      assert(Array.isArray(r.lines) && r.lines.length > 0, `no lines: ${JSON.stringify(r).slice(0, 300)}`);
      console.log(`      ${r.store} · ${r.lines.length} lines · total ${r.total} ${r.currency}`);
    });
  } else {
    await test("parse-receipt (live) rejects a non-receipt image with 422", async () => {
      await rejects(
        A.pb.send("/api/babelcart/parse-receipt", { method: "POST", body: { imageBase64: PNG.toString("base64"), mediaType: "image/png" } }),
        [422, 502],
        "not a receipt",
      );
    });
  }
}

section("Archive (personal)");
const archive = (u, body) => u.pb.send("/api/babelcart/archive", { method: "POST", body });
await test("B archives the list → only B's membership row is archived", async () => {
  const r = await archive(B, { list_id: list.id, archived: true });
  eq(r.archived, true, "response");
  eq((await memberRow(B.pb, list.id, B.id)).archived, true, "B's row");
  eq((await memberRow(A.pb, list.id, A.id)).archived, false, "A's row untouched");
});
await test("an archived list stays visible to everyone, B included", async () => {
  await A.pb.collection("lists").getOne(list.id);
  await B.pb.collection("lists").getOne(list.id);
});
await test("archived can't be written through list_members updates (own or others')", async () => {
  const bRow = await memberRow(A.pb, list.id, B.id);
  await rejects(A.pb.collection("list_members").update(bRow.id, { archived: false }), [400, 403, 404], "owner unarchives B");
  const aRow = await memberRow(A.pb, list.id, A.id);
  await rejects(A.pb.collection("list_members").update(aRow.id, { archived: true }), [400, 403, 404], "owner sets own via update");
  eq((await memberRow(B.pb, list.id, B.id)).archived, true, "B still archived");
});
await test("archive route: non-member 404, bad input 400, requires auth", async () => {
  await rejects(archive(C, { list_id: list.id, archived: true }), [404], "outsider");
  await rejects(archive(B, { list_id: list.id, archived: "yes" }), [400], "non-bool");
  await rejects(archive(B, { archived: true }), [400], "missing list_id");
  await rejects(new PocketBase(URL_).send("/api/babelcart/archive", { method: "POST", body: { list_id: list.id, archived: true } }), [401], "anonymous");
});
await test("B unarchives the list", async () => {
  const r = await archive(B, { list_id: list.id, archived: false });
  eq(r.archived, false, "response");
  eq((await memberRow(B.pb, list.id, B.id)).archived, false, "B's row");
});

section("No hay (unavailable)");
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString().replace("T", " ");
let nhList, nhX, nhY;
await test("items start as not unavailable; lists default to keep", async () => {
  nhList = await A.pb.collection("lists").create({ name: "No hay", code: "NH" + randomBytes(2).toString("hex").toUpperCase(), created_by: A.id });
  created.lists.push(nhList.id);
  eq(nhList.unavailable_policy, "", "policy default (empty = keep)");
  nhX = await A.pb.collection("items").create({ list_id: nhList.id, original: "por", added_by: A.id });
  nhY = await A.pb.collection("items").create({ list_id: nhList.id, original: "pan", added_by: A.id });
  eq([nhX.unavailable, nhX.unavailable_at], [false, ""], "new item");
});
await test("marking No hay unchecks the item and stamps unavailable_at (hook)", async () => {
  await A.pb.collection("items").update(nhX.id, { checked: true, checked_at: new Date().toISOString() });
  const r = await A.pb.collection("items").update(nhX.id, { unavailable: true });
  eq([r.unavailable, r.checked, r.checked_at], [true, false, ""], "status after No hay");
  assert(r.unavailable_at, "unavailable_at set");
});
await test("checking a No hay item takes it out of No hay", async () => {
  const r = await A.pb.collection("items").update(nhX.id, { checked: true, checked_at: new Date().toISOString() });
  eq([r.checked, r.unavailable, r.unavailable_at], [true, false, ""], "bought after all");
});
await test("checks maintain lists.last_checked_at; clients can't write it", async () => {
  const l = await A.pb.collection("lists").getOne(nhList.id);
  assert(l.last_checked_at, "last_checked_at set by the check");
  await rejects(A.pb.collection("lists").update(nhList.id, { last_checked_at: hoursAgo(10) }), [400, 403], "client writes last_checked_at");
});
await test("policy keep: a new trip doesn't bring No hay items back", async () => {
  await A.pb.collection("items").update(nhX.id, { unavailable: true });
  await A.pb.collection("items").update(nhY.id, { checked: true, checked_at: new Date().toISOString() });
  eq((await A.pb.collection("items").getOne(nhX.id)).unavailable, true, "still No hay");
});
await test("policy next_trip: a check within 3 h keeps them", async () => {
  await A.pb.collection("lists").update(nhList.id, { unavailable_policy: "next_trip" });
  await A.pb.collection("items").update(nhY.id, { checked: false, checked_at: "" });
  await A.pb.collection("items").update(nhY.id, { checked: true, checked_at: new Date().toISOString() });
  eq((await A.pb.collection("items").getOne(nhX.id)).unavailable, true, "still No hay in the same trip");
});
if (ADMIN_EMAIL) {
  await test("policy next_trip: the first check after > 3 h brings them back", async () => {
    await su.collection("lists").update(nhList.id, { last_checked_at: hoursAgo(4) });
    await A.pb.collection("items").update(nhY.id, { checked: false, checked_at: "" });
    await A.pb.collection("items").update(nhY.id, { checked: true, checked_at: new Date().toISOString() });
    const x = await A.pb.collection("items").getOne(nhX.id);
    eq([x.unavailable, x.checked], [false, false], "back to to-buy");
  });
  await test("policy next_day: items marked before today come back (release route)", async () => {
    await A.pb.collection("lists").update(nhList.id, { unavailable_policy: "next_day" });
    await A.pb.collection("items").update(nhX.id, { unavailable: true });
    await su.collection("items").update(nhX.id, { unavailable_at: hoursAgo(30) });
    const fresh = await A.pb.collection("items").create({ list_id: nhList.id, original: "sal", added_by: A.id });
    await A.pb.collection("items").update(fresh.id, { unavailable: true });
    const res = await su.send("/api/babelcart/release-unavailable", { method: "POST" });
    assert(res.released >= 1, "released count");
    eq((await A.pb.collection("items").getOne(nhX.id)).unavailable, false, "yesterday's item back");
    eq((await A.pb.collection("items").getOne(fresh.id)).unavailable, true, "today's item stays");
  });
}
await test("the release route is superuser-only", async () => {
  await rejects(A.pb.send("/api/babelcart/release-unavailable", { method: "POST" }), [403], "user calls release");
});

section("Deleting");
await test("non-owner can't delete the list", async () => {
  await rejects(B.pb.collection("lists").delete(list.id), [400, 403, 404], "member deletes list");
});
await test("owner deletes the list → items cascade away", async () => {
  await A.pb.collection("lists").delete(list.id);
  created.lists = created.lists.filter((id) => id !== list.id);
  await rejects(A.pb.collection("items").getOne(item.id), [404], "item survived");
  await waitFor(bEvents, (ev) => ev.some((e) => e.action === "delete" && e.record.id === item.id));
});

// ── cleanup ───────────────────────────────────────────────────────────────
if (unsubB) await unsubB();
await unsubC();
if (!KEEP) {
  for (const id of created.lists) {
    try { await A.pb.collection("lists").delete(id); } catch { /* not owner */ }
    try { await B.pb.collection("lists").delete(id); } catch { /* not owner */ }
  }
  for (const u of [A, B, C, D]) {
    try { await u.pb.collection("users").delete(u.id); } catch (err) { console.log(`  (could not delete user ${u.id}: ${err.message})`); }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
process.exit(0);
