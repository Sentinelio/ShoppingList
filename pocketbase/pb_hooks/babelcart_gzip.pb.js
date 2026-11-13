/// <reference path="../pb_data/types.d.ts" />

// Compress API responses. PocketBase doesn't by default, and phones reach
// the server over mobile data through Tailscale Funnel: the catalog alone is
// ~600 KB as plain JSON and ~150 KB gzipped (only when the browser accepts
// gzip). The realtime stream is left uncompressed so every event reaches the
// browser as it happens. Errors from the route pass through untouched (never
// catch here: running e.next() twice would run the route twice).
routerUse((e) => {
  if (String(e.request.url.path || "").startsWith("/api/realtime")) return e.next()
  return $apis.gzip().func(e)
})
