import "server-only";
import { NextResponse } from "next/server";

// Shared error-response helper (issue #8) — routes were hand-rolling
// `NextResponse.json({ error: error.message }, { status })`, leaking raw
// Supabase/Postgres error text (table/column/constraint names) to any
// authenticated caller. logDetail goes to the server console only.
//
// Retrofit is incremental per small-PR discipline — this fixes the routes
// named in the issue's own evidence, not a mass refactor of every route.
export function jsonError(
  status: number,
  publicMessage: string,
  opts?: { logDetail?: unknown; logTag?: string },
) {
  if (opts?.logDetail !== undefined) {
    console.error(opts.logTag ?? "[api]", opts.logDetail);
  }
  return NextResponse.json({ error: publicMessage }, { status });
}
