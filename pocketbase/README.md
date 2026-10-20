# BabelCart backend (PocketBase)

The whole backend lives in this folder:

```
pocketbase/
├── pb_migrations/      schema (JS migrations) — applied automatically on start
├── pb_hooks/           custom routes + hooks (replace Edge Functions and triggers)
│   └── lib/            shared code, loaded with require() inside each handler
├── tests/run.mjs       backend test suite (permissions, hooks, routes)
├── deploy-server.ps1   deploy to the Windows server
└── README.md
```

The frontend reaches it at `VITE_PB_URL` (`.env.production`:
`https://server-pc.tail3b4002.ts.net`).

## Server layout

| What | Where |
|---|---|
| Binary | `C:\pocketbase\pocketbase.exe` (latest stable) |
| Service | NSSM service `PocketBase`, listening on `127.0.0.1:8090` |
| Data | `C:\pocketbase\pb_data` (SQLite + uploaded files) |
| Migrations / hooks | `C:\pocketbase\pb_migrations`, `C:\pocketbase\pb_hooks` (copied from this folder) |
| Public URL | Tailscale Funnel → `https://server-pc.tail3b4002.ts.net` (dashboard at `/_/`) |

> ⚠️ The same domain serves another app on **`/webhook`** and **`/health/public`**.
> PocketBase only uses `/api/*` and `/_/`; don't route anything else there.

## Environment variables (on the service)

Set with `nssm set PocketBase AppEnvironmentExtra KEY=value ...` (one call with
all of them; it replaces the list) and restart the service.

| Variable | Default | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | — (required) | all Claude routes |
| `BABELCART_MODEL_TRANSLATE` | `claude-haiku-5-5` | `translate`, `seed-dictionary` |
| `BABELCART_MODEL_UI` | `claude-haiku-5-5` | `translate-ui` |
| `BABELCART_MODEL_RECEIPT` | `claude-sonnet-5-5` | `parse-receipt` |
| `BABELCART_DRY_RUN` | unset | `1` = never call Claude; routes answer with the request they would send. **Tests only — never on the real server.** |

Recommended service arguments (CORS limited to the app):

```
serve --http=127.0.0.1:8090 --origins=https://sentinelio.github.io,http://localhost:5173,http://localhost:4173
```

## Install from scratch

1. Download the latest PocketBase for Windows (amd64) from
   <https://github.com/pocketbase/pocketbase/releases> and unzip
   `pocketbase.exe` into `C:\pocketbase`.
2. Create the service (elevated PowerShell):
   ```powershell
   nssm install PocketBase C:\pocketbase\pocketbase.exe serve --http=127.0.0.1:8090 --origins=https://sentinelio.github.io,http://localhost:5173
   nssm set PocketBase AppDirectory C:\pocketbase
   nssm set PocketBase AppEnvironmentExtra ANTHROPIC_API_KEY=sk-ant-...
   nssm set PocketBase AppStdout C:\pocketbase\service.log
   nssm set PocketBase AppStderr C:\pocketbase\service.log
   ```
3. Publish it: `tailscale funnel --bg 8090` (or add `/` → `127.0.0.1:8090`
   next to the existing `/webhook` and `/health/public` handlers).
4. Deploy this folder with `-Reset` (below), then create the superuser.
5. Open the app once to create your profile, then in `/_/` → **users** tick
   `is_admin` on your user (the app's `#admin` page shows your user id).

## Deploy

From a clone of the repo on the server, in an **elevated** PowerShell:

```powershell
git pull
.\pocketbase\deploy-server.ps1            # normal update
.\pocketbase\deploy-server.ps1 -Reset     # first install / wipe all data
```

The script stops the service, replaces `C:\pocketbase\pb_migrations` and
`C:\pocketbase\pb_hooks` with the repo copies, (with `-Reset`) deletes
`C:\pocketbase\pb_data`, starts the service and checks
`http://127.0.0.1:8090/api/health`. Pending migrations run on start.

The first deploy **must** use `-Reset`: the earlier prototype
(`1792516000_babelcart_schema.js`) created collections with the same names and
a different shape. The script refuses to deploy over it without `-Reset`.

After `-Reset`, recreate the superuser:

```powershell
C:\pocketbase\pocketbase.exe superuser upsert you@example.com "a-long-password" --dir C:\pocketbase\pb_data
```

## Adding a migration

1. Create `pb_migrations/<unix-timestamp>_<what>.js`, with a timestamp larger
   than the last file (files run in name order):
   ```js
   /// <reference path="../pb_data/types.d.ts" />
   migrate((app) => {
     const items = app.findCollectionByNameOrId("items")
     items.fields.add(new TextField({ name: "barcode" }))
     app.save(items)
   }, (app) => {
     const items = app.findCollectionByNameOrId("items")
     items.fields.removeByName("barcode")
     app.save(items)
   })
   ```
   You can also change the schema in a **local** dashboard: `serve` runs with
   `--automigrate` on by default, so PocketBase writes the migration file into
   the migrations dir for you (point `--migrationsDir` at this folder).
   Don't change the schema from the production dashboard: the generated file
   would only exist on the server and the next deploy deletes it.
2. Never edit a migration that is already deployed; add a new one.
3. Run the tests locally (below), commit, deploy.

## Testing locally

```powershell
# fresh local instance on :8091 with this folder's migrations/hooks, no Claude calls
mkdir $env:TEMP\pbtest; copy C:\pocketbase\pocketbase.exe $env:TEMP\pbtest\
cd $env:TEMP\pbtest
.\pocketbase.exe superuser upsert admin@test.local Test-Password-123 --dir .\pb_data
$env:BABELCART_DRY_RUN = "1"
.\pocketbase.exe serve --http=127.0.0.1:8091 --dir .\pb_data `
  --migrationsDir C:\path\to\repo\pocketbase\pb_migrations `
  --hooksDir C:\path\to\repo\pocketbase\pb_hooks

# in the repo, another terminal
npm run test:pb -- --admin-email admin@test.local --admin-pass Test-Password-123
```

Run the frontend against it with `VITE_PB_URL=http://127.0.0.1:8091 npm run dev`.

Against the real server (Claude is called for real; creates and deletes its own
throwaway users and lists):

```powershell
npm run test:pb -- --url https://server-pc.tail3b4002.ts.net --live `
  --admin-email <superuser> --admin-pass <password> [--receipt C:\path\ticket.jpg]
```

## Data model

Collections and fields keep the old Postgres names (`list_id`, `added_by_name`,
`checked_at`, `brand`…). Relations replace foreign keys with the same
`ON DELETE` behaviour (`cascadeDelete`, or unset for `SET NULL`).

| Collection | Notes |
|---|---|
| `users` (auth) | The Supabase `users` table merged into PocketBase auth: `name`, `lang`, `country`, `avatar_color`, `last_seen_at`, **`is_admin`**, `created_at` |
| `lists` | + **`active_members`**, **`owners`** (hook-maintained) |
| `list_members` | unique `(list_id, user_id)`; created only by the server |
| `items` | + **`photo`** (URL), **`important`** |
| `item_photos` | **new**: replaces the `item-photos` bucket |
| `item_prices`, `item_comments`, `item_history` | as in 011–016 |
| `receipts` | `photo` file field replaces `photo_url` + `receipt-photos` bucket |
| `receipt_items`, `product_prices`, `dictionary`, `store_phrases`, `app_config` | as before |

### Fields that did not exist in Supabase

- `users.is_admin` — unlocks writing `dictionary`, `store_phrases`,
  `app_config`, the `seed-dictionary` route and the admin page. Only settable
  from the dashboard: the users rules and a hook reject it from any client
  (also for the user themselves).
- `lists.active_members`, `lists.owners` — denormalized copies of
  `list_members` (active rows / active owners), written only by
  `pb_hooks/babelcart_members.pb.js` whenever a `list_members` row is created,
  updated or deleted. Every "is this user an active member?" rule checks them,
  because several `?=` conditions over the `list_members` back-relation may
  match *different* rows. Clients can't write them (rules + hook).
- `items.photo`, `items.important` — used by the app but never added by the SQL
  migrations.
- `item_photos` collection (`file`, `uploaded_by`) — storage for item photos.
- `created_at` on `users` (PocketBase's own is `created`).

### Nulls

PocketBase has no NULL: empty text/date/relation = `""`, empty number = `0`.
The frontend maps them back (`src/lib/pocketbase.ts`, `fromPb`). In particular
`item_prices.price_value = 0` means "purchase without price" (was NULL), and
such rows are not mirrored into `product_prices`.

## Permissions (summary)

- Public read: `dictionary`, `store_phrases`, `app_config`. Writes: admins.
- `users`: list → only yourself (admins: everyone); view → any signed-in user;
  update/delete → yourself, never `is_admin`.
- `lists`: visible to active members. Any active member can rename; settings
  (`require_approval`, `who_can_*`), `code`, `created_by` are owner-only; delete → owners.
- `list_members`: no client creates. Approve/reject follows `who_can_approve`;
  remove follows `who_can_remove`; changing `role` is owner-only; anyone can
  delete their own row (leave / cancel request).
- `items`, `item_*`, `receipts`, `receipt_items`: active members of the list only.
- `product_prices`: read by any signed-in user; written only by hooks; delete own.

## Routes (`/api/babelcart/*`, all require auth)

| Route | Replaces |
|---|---|
| `POST join` `{ code }` → `{ list, status, already }` | client-side insert into `list_members` |
| `GET my-requests` → pending join requests with list name/code | join `list_members → lists` |
| `POST translate` `{ text, langs }` → `{ t, c, b }` (+ saves to `dictionary`) | Edge Function `translate` |
| `POST translate-ui` `{ strings, targetLang, targetLangName }` → `{ translations }` | `translate-ui` |
| `POST parse-receipt` `{ imageBase64 \| imageUrl, mediaType?, targetLangs? }` | `parse-receipt` (422 `not_a_receipt`) |
| `POST seed-dictionary` (admin) | `seed-dictionary` |
| `POST phrase-used` `{ key }` | RPC `increment_store_phrase_usage` |

`run-migration` is gone: PocketBase migrations replace it. Prompts are copied
verbatim from the Edge Functions (`legacy/supabase/functions`) into
`pb_hooks/lib/prompts.js`.
