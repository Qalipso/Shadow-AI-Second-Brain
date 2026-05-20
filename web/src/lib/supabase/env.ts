// Single source of truth for Supabase env presence.
// Pages and lib code use `hasSupabase()` to decide whether to query DB
// or fall through to empty/seed-fallback paths in dev.

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function hasSupabase(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}
