# HANDOFF — BabelCart (ShoppingList)

Updated 2026-11-09. Branch `claude/polyglot-shopping-cart-doquB` (also the main branch).
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
