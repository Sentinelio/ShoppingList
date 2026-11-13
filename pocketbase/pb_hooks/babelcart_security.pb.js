/// <reference path="../pb_data/types.d.ts" />

// ─────────────────────────────────────────────────────────────────────────
// Superuser access only from this machine.
//
// The server is reachable from the internet through Tailscale Funnel, which
// proxies /api to 127.0.0.1:8090. The Funnel config blocked the exact path
// /api/collections/_superusers, but PocketBase also finds that collection by
// its id (pbc_3142635823) and case-insensitively (_SUPERUSERS), so superuser
// login stayed reachable from outside (audit 2026-11-12).
//
// Rule: a request that came through a proxy (it carries X-Forwarded-For or
// another forwarding header; a direct request to 127.0.0.1 never does) may
// not touch the superusers collection, under any spelling, nor use a
// superuser token. The dashboard keeps working at http://127.0.0.1:8090/_/
// on the server itself.
// ─────────────────────────────────────────────────────────────────────────
routerUse((e) => {
  const h = e.request.header
  const proxied = !!(h.get("X-Forwarded-For") || h.get("X-Forwarded-Host") || h.get("X-Forwarded-Proto") ||
    h.get("Forwarded") || h.get("Tailscale-User-Login") || h.get("Tailscale-Funnel-Request"))
  if (!proxied) return e.next()

  const path = String(e.request.url.path || "").toLowerCase()
  const superusersPath = /^\/api\/collections\/(_superusers|pbc_3142635823)(\/|$)/.test(path)
  const adminUi = path === "/_" || path.startsWith("/_/")
  let superuserToken = false
  try { superuserToken = !!(e.auth && e.auth.isSuperuser()) } catch (_) { /* no auth */ }

  if (superusersPath || adminUi || superuserToken) {
    console.warn(`[babelcart/security] blocked proxied superuser request: ${e.request.method} ${path}`)
    throw new ForbiddenError("Not available from outside the server.")
  }
  return e.next()
})
