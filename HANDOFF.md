# HANDOFF — BabelCart (ShoppingList)

Updated 2026-11-13. Branch `claude/polyglot-shopping-cart-doquB` (also the main branch).
Deadline for the mobile redesign: 2026-11-08.

## Hecho (published unless noted)
- Mobile redesign phases 1–7; Fluent 3D icons; admin fixes; themes per screen.
- Admin: mobile home with groups; desktop (≥1024 px) sidebar + Users/Lists tables; admin texts in English.
- User public ID `users.tag` (K7M-2QX), in-app notifications + admin messages, add sheet (instant add,
  results grow upwards, quantity field with common quantities), suggestion ranking (`src/lib/suggestRank.ts`,
  checked over the whole dictionary with `npm run check:suggest`).
- Real screens in the URL + Back closes sheets (`src/lib/router.ts`); product detail is a full page.
- Lists no longer "disappear": session keep-alive, loading/error states (`src/hooks/useAuth.ts`, `useList.ts`).
- Server also serves the app at `/ShoppingList/` (pb_public) + one-time session transfer
  (migration 1792540007, `pb_hooks/babelcart_transfer.pb.js`) — **backend deployed, frontend commit 87ef90a NOT pushed**.
- Petición 030: server moved to `Servidor\`, backups to `Copias\`, tools to `Pruebas\` (all git-ignored);
  NSSM service updated; commit e48e8f9 **not pushed**.
- 2026-11-09: service wouldn't start (pointed to WinGet `Links\nssm.exe`, folder gone). Copied win64 nssm.exe to
  `Servidor\nssm.exe`, `sc.exe config PocketBase binPath=` to it (rest of the config untouched), RUNNING, Automatic,
  /api/health 200 local + Funnel. `deploy-server.ps1` now falls back to `<PbDir>\nssm.exe` when nssm isn't in PATH
  (committed with HANDOFF.md, **not pushed**: it goes up together with 87ef90a + e48e8f9 once Manu has set the
  Tailscale route). Other NSSM services (Bazarr, bw-api, bw-ingress) point to existing nssm.exe files: not broken.

- 2026-11-13 published (Pages + server copy): "Mostrar en la tienda" (also from search), delete product/list
  stays/goes home correctly, Store shows qty/brand/note + phrases in the country's language, instant open from a
  device cache (`src/lib/deviceCache.ts`). Router: `closeThenGo()` (flushSync) for "close overlay + navigate".

- 2026-11-13 (server + app published): superuser blocked through the proxy (babelcart_security.pb.js); Anthropic
  retries; batch catalog generation; catalog import/export (admin ⋯ menu); photo picker (file/URL/paste);
  singular/plural search; regional words (`<lang>-<CC>` keys, admin "Regional" button, dictionary.regional_checked);
  purchase log `purchases` (migration 1792540008) + `lists.clear_bought` (hourly sweep, default daily) → history in
  Bought, "Most bought", stats by product, category order by buying; admin mode (1792540009: admins work in any list
  without being members). Backups of the day: Copias\pb_data-20261113-1103, -1332, -1413.

- 2026-11-13 later: wake from standby fixed (catalog kept on device, refreshed ≤ every 6 h; index for regional
  words; gzip middleware babelcart_gzip.pb.js) — wake 573 KB → 6 KB. Fixed: /translate dictionary poisoning,
  Anthropic retry budget (25 s), price book kept when bought items are cleared, category order uses days before
  today, deploy-server.ps1 nssm stderr. Backup Copias\pb_data-20261113-1502.

- 2026-11-13 evening: product memory (migration 1792540011, babelcart_product_memory.pb.js): comments / history /
  prices belong to list + product_key and survive the clearing of bought items; a product added again gets its
  last photo and brand back (purchases.photo/brand). Backup Copias\pb_data-20261113-1603.

- 2026-11-13 18:30 audit (app only, published): Regional failed 18× in the live log with "invalid JSON" at ~30 s =
  reply cut at 8000 output tokens (Spanish, 10 countries × 40 products); retrying the same batch failed again.
  RegionalDialog: batch = 200 / countries (8..40) + a cut reply is retried as two halves (headless test with faked
  cut replies: 878/878, 0 failed). Also retries ×3 + "Retry the N failed" (d344e33). eslint ignores Pruebas/Servidor/
  Copias (`eslint .` hung on the Chrome profiles). Verified: tsc, eslint, npm audit 0, test:pb 93/93 on pbcopy4
  (hooks from Pruebas\hooks-test, synced), memory-test 13/13, live log 8 h: no slow non-AI requests.
  Read-only log tools: Pruebas\babelcart-tools\audit-logs.mjs, regional-log.mjs.

- 2026-11-13 18:50 audit fixes (commit "fix: audit 18:30"): photos shrunk to 1280 px WebP before upload; removed
  photo stays removed; memory + purchases follow a rename / late translation (SQL rekey in
  babelcart_product_memory.pb.js); migration 1792540012 (login alerts off: no SMTP; item_photos.uploaded_by no
  cascade); Regional spend counts cut replies. Tested on Pruebas\pbcopy5 (copy of today's data, :8095):
  fixes2-test 14/14, test:pb 93/93. App published (Pages + server copy).
  ACTIVE since Manu's admin restart ~19:30 (backup Copias\pb_data-20261113-reinicio, integrity ok): migration 0012
  applied, alerts off, superuser 403 from outside, counts vs Copias 1846 identical except dictionary +203 (Manu's
  generation). NOTE: counts.mjs needs the data.db path as argument (counts2.mjs = the other tables).
  (Before:) new hooks/migration were copied into Servidor\ but the service was never restarted —
  `nssm stop/start` needs Administrator (fails with exit 3 "Access is denied"; deploy-server.ps1 #Requires admin).
  Manu: restart from an Administrator PowerShell (stop, backup, start); then check with
  `node Pruebas\babelcart-tools\check-0012.mjs` (last migration must be 1792540012, alerts 0).
  LESSON: without admin, Get-Process shows Path empty, so a `Path -like "*Servidor*"` "is it stopped?" check passes
  falsely. Use `nssm status PocketBase` (must say SERVICE_STOPPED) and check nssm's exit code. Backups 18:42 and 18:46
  were copied with the service running; check-backups.mjs (PRAGMA integrity_check) says all Copias are ok.
- 19:10 Generate items: "cut by the token limit before any complete entry" (4 batches, ~73 s = full 16000 tokens;
  60×7 langs needs ~4000 → the model wrote notes before the JSON). seed-dictionary now sends a JSON schema
  (output_config.format, fallback without it on a 400); cut replies log their head via $app.logger(). Dry-run tested
  only — the real call is verified after the admin restart (look in the log for "structured output refused").
  Hooks copied into Servidor\pb_hooks, waiting for that restart too.
- Ollama on the server (11434), tested 2026-11-13 (Pruebas\babelcart-tools\ollama-compare.mjs vs catalog):
  glm-5.3-flash:cloud and gpt-oss:120b-cloud answer "Add usage credits or subscribe" (not free); llama3.2:3b local
  (CPU) gets 3/90 identical, mangles names ("hat" → es «gato»). Decision: keep Claude for translations.
- Orphan photo cleanup (Manu OK'd): babelcart_photos.pb.js + lib/photos.js, Sundays 04:30, deletes item_photos used
  by no item/purchase and older than 30 days (photos-test.mjs 4/4 on pbcopy5). Today 2 orphans (5 MB). Copied into
  Servidor\pb_hooks, active after the admin restart.

- 20:05 "Salir de la lista" left on the server but the app stayed in the list (one goBack landed on another entry of the
  same list; admins can still read it). router goBackOut() backs past every entry of the list (leave-setup.mjs +
  leave-extra.mjs: old build stays, new goes home; mobile + desktop). Published.
- Admin options (Manu OK 2026-11-13, commit 69f444f, ACTIVE + published): Ajustes → Admin (admin panel button, search/open
  any list, "Edit lists I'm not a member of" = users.admin_edit). Migration 1792540013 (admin_edit + item-level write
  rules need it for non-member admins; default read-only), babelcart_admin.pb.js (non-member admin shows as "Admin",
  also in notifications). Tested on pbcopy5: admin-ro-test 21/21, test:pb 93/93, admin-ui-setup headless ok.
  Live rules == tested rules (rules-compare.mjs). Files copied into Servidor\. Manu restarted as admin (backup Copias\pb_data-20261113-admin,
  integrity ok): last migration 1792540013, live rules == tested copy, counts identical to the backup, Pages + server copy
  have the new app. Manu's admin_edit starts OFF (read-only in lists he is not a member of).

## Auditoría 2026-11-13 — still open (decide with Manu)
- AI cost: no per-user daily quota on translate / translate-ui / parse-receipt; no size cap on translate-ui
  strings and receipt images. Set a monthly limit in console.anthropic.com meanwhile.
- list_members updateRule: an approver (any_member mode) can reject the owner (rule change → ask).
- Invite codes 6 chars + /join without rate limit; purchases visible to members from before they joined.
- Frontend: failed writes look successful (`catch { /* realtime will sync */ }`); list cache not cleared on
  404/403; late background sign-in can undo a profile edit; AddItemSheet loses qty/note on quick close; unit
  select saves unsaved edits; Spanish hardcoded in ItemDetail and in stored history texts.
- Ops: no automatic / off-machine backups; NSSM stdout/stderr not logged.

## Auditoría 2026-11-12 (pendiente, por prioridad)
1. DONE 2026-11-13 (superuser block, verified 403 from outside). Manu: still enable MFA at http://127.0.0.1:8090/_/.
   Italian is NOT in the server's enabled_langs (en es pl de fr pt nl): enabling it in the admin did not save.
2. Anthropic cost abuse: free unlimited accounts + translate/translate-ui/parse-receipt without quota/size caps.
3. No automatic/off-machine backups (newest Copias 2026-11-02); C: only ~9.5 GB free.
4. deploy-server.ps1: empties hooks/migrations before copy, no auto-backup/rollback, -Force skips -Reset prompt.
5. Failed writes look successful (`catch { /* realtime will sync */ }` in ListDetailPage); cache not cleared on
   404/403 of a list; list_members update rule lets an approver reject the owner; 6-char invite codes, /join
   without rate limit; brand dictionary key taken from model output.
6. Perf: dictionary re-downloaded on every return (liveConfig.ts:55); overview fetches all items; raw photos.
7. Minor: no service stdout/stderr logs; Pages workflow without lint; hardcoded Spanish in ItemDetail and item
   history; tap targets < 44 px; changelog in main chunk.

## Pendiente
1. Done 2026-11-10: Manu added the Tailscale route `/ShoppingList` → `http://127.0.0.1:8090/ShoppingList`.
   Lesson: `tailscale serve ...` REMOVES Funnel on that port; always give Manu `tailscale funnel --bg ...` instead
   (he restored it that way; all 443 paths public again). Commits 87ef90a, e48e8f9, 1609c07 pushed. Still to
   check from outside the tailnet (phone on mobile data, Tailscale off) and to test "Abrir en el servidor" with Tailscale on.
2. **iPhone (Marta) shows the app without CSS** — waiting for her tests (wait for load, reload, private tab,
   iOS version, content blockers). If it's a stale cache: add a self-reload when the stylesheet is missing.
3. Proposed, waiting for Manu: Ajustes de la lista + Importar tique as pages; "Para otro momento"; habituales
   (needs a durable purchase log); brainstorm of list types (historial, top 100, plantillas, kit de viaje…).
4. Later: inactivity auto-delete with 30-day trash (default OFF); desktop Contenido + Sistema (inline-edit
   catalog, phrases, languages, stats, versions, editable roadmap in app_config "roadmap").
5. Small: hung vite pid 22052 (:5173, since 20-10) — Manu closes it; `C:\pocketbase\tailscale-serve-backup.json`
   destination — Manu decides; empty `C:\BabelCart-backups` left in place.

## Decisiones (y por qué)
- Real data: never `-Reset`, migrations additive only, backup before every backend deploy (service stopped and
  checked: no process, or the copy gets -wal files), test migrations on a copy on :8092, backend before frontend.
- Fix and verify generally, never only against the user's examples (whole-dictionary checks, broken-variant tests).
- Admin texts in English; app texts in es/en/pl by hand, other languages via admin-generated UI translations.
- Session transfer by one-time code (5 min, single use) rather than credentials in the URL.

## Ficheros clave
- Server runtime: `Servidor\` (NSSM `PocketBase` run by `Servidor\nssm.exe`, :8090, `--dir=Servidor\pb_data`);
  backups `Copias\`.
- Deploy: `pocketbase\deploy-server.ps1` (no -Reset), `pocketbase\deploy-app.ps1` (server copy of the app).
- Backend tests: `npm run test:pb -- --url http://127.0.0.1:8092 --dry-run --admin-email <copy superuser>`.
- Test tooling (not versioned): `Pruebas\babelcart-tools\` (shot.mjs = headless Chrome screenshots, counts.mjs =
  read-only record counts), `Pruebas\mover-servidor.ps1` (-Prueba / -Deshacer).
- Coordination with other sessions: `C:\MyProjects\coordinacion\peticiones\030-orden-de-carpetas.md`.
