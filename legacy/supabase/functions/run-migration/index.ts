// Runs a specific, hardcoded database migration against the user's Supabase
// project using the service_role key. Exposes a whitelist of migration ids
// so a compromised anon key can't execute arbitrary SQL — only the pre-
// approved DDL that ships with the app.
//
// The admin UI calls this from the Phrases tab banner when migration 005
// isn't applied yet, saving the user a trip to the Supabase SQL editor.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { corsHeadersFor, requireAuth } from "../_shared/auth.ts"

// ── Migration registry ────────────────────────────────────────────────────
// Each entry is a tuple of [id, array_of_sql_statements]. The SQL is split
// into individual statements because Supabase's postgres-js client doesn't
// support multi-statement queries in a single call.
const MIGRATIONS: Record<string, string[]> = {
  "005_store_phrases": [
    `CREATE TABLE IF NOT EXISTS store_phrases (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key          text UNIQUE NOT NULL,
        emoji        text NOT NULL DEFAULT '💬',
        translations jsonb NOT NULL DEFAULT '{}'::jsonb,
        sort_order   int  NOT NULL DEFAULT 0,
        usage_count  int  NOT NULL DEFAULT 0,
        last_used_at timestamptz,
        created_at   timestamptz DEFAULT now(),
        updated_at   timestamptz DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_store_phrases_order ON store_phrases (sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_store_phrases_usage ON store_phrases (usage_count DESC)`,
    `CREATE OR REPLACE FUNCTION increment_store_phrase_usage(p_key text)
     RETURNS void AS $$
     BEGIN
         UPDATE store_phrases
         SET usage_count = usage_count + 1,
             last_used_at = now()
         WHERE key = p_key;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER`,
    `GRANT EXECUTE ON FUNCTION increment_store_phrase_usage(text) TO anon, authenticated`,
    `ALTER TABLE store_phrases ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "store_phrases_select_public" ON store_phrases`,
    `CREATE POLICY "store_phrases_select_public" ON store_phrases FOR SELECT USING (true)`,
    `DROP POLICY IF EXISTS "store_phrases_write_anon" ON store_phrases`,
    `CREATE POLICY "store_phrases_write_anon" ON store_phrases FOR ALL USING (true) WITH CHECK (true)`,
  ],
}

// Bootstrap helper: a one-shot SQL function that lets us run DDL via the
// supabase-js client. If it doesn't exist yet we create it with direct HTTP
// to the postgres-meta endpoint (not pleasant — see below for fallback).
const EXEC_SQL_FN = `
CREATE OR REPLACE FUNCTION exec_admin_migration_sql(p_sql text)
RETURNS void AS $$
BEGIN
    EXECUTE p_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const unauthorized = requireAuth(req)
  if (unauthorized) return unauthorized

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured on the Edge Function")
    }

    const { migrationId } = await req.json() as { migrationId?: string }
    if (!migrationId || !MIGRATIONS[migrationId]) {
      return new Response(
        JSON.stringify({ error: `Unknown migrationId. Allowed: ${Object.keys(MIGRATIONS).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const statements = MIGRATIONS[migrationId]
    const supabase = createClient(supabaseUrl, serviceKey)

    // Ensure the bootstrap function exists. We use direct postgres REST to
    // call pg-meta (https://<project>.supabase.co/pg-meta/default/query).
    // Supabase provides this endpoint with the service role key for DDL.
    const runSqlViaPgMeta = async (sql: string): Promise<void> => {
      const pgMetaUrl = `${supabaseUrl}/pg/query`
      const res = await fetch(pgMetaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      })
      if (!res.ok) {
        // Fall back: try via supabase.rpc once the exec function exists.
        const body = await res.text()
        throw new Error(`pg-meta ${res.status}: ${body}`)
      }
    }

    const runSql = async (sql: string): Promise<void> => {
      // First try via the exec function (works once bootstrapped).
      const { error } = await supabase.rpc("exec_admin_migration_sql", { p_sql: sql })
      if (!error) return
      // Bootstrap path: create the exec function via pg-meta, then retry.
      if (String(error.message).includes("function") && String(error.message).includes("does not exist")) {
        await runSqlViaPgMeta(EXEC_SQL_FN)
        const retry = await supabase.rpc("exec_admin_migration_sql", { p_sql: sql })
        if (retry.error) throw retry.error
        return
      }
      throw error
    }

    const results: Array<{ ok: boolean; statement: string; error?: string }> = []
    for (const stmt of statements) {
      try {
        await runSql(stmt)
        results.push({ ok: true, statement: stmt.slice(0, 80) })
      } catch (err) {
        results.push({
          ok: false,
          statement: stmt.slice(0, 80),
          error: (err as Error).message,
        })
      }
    }

    const okCount   = results.filter(r => r.ok).length
    const failCount = results.filter(r => !r.ok).length

    return new Response(
      JSON.stringify({
        migrationId,
        applied: okCount,
        failed: failCount,
        total: results.length,
        results,
      }),
      {
        status: failCount > 0 ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
