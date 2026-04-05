// Minimal pre-flight check for Edge Functions. Not a full JWT validation
// (the app uses localStorage-based fake auth, no real Supabase auth yet),
// but blocks naive direct abuse: any caller must at least present an
// Authorization bearer token (clients send the anon key automatically).

export const ALLOWED_ORIGINS = [
  "https://sentinelio.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
];

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    "Vary": "Origin",
  };
}

export function requireAuth(req: Request): Response | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: missing bearer token" }),
      { status: 401, headers: { ...corsHeadersFor(req), "Content-Type": "application/json" } },
    );
  }
  return null;
}
