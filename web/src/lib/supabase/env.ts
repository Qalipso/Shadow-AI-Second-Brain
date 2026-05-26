// Single source of truth for Supabase env presence.
// Pages and lib code use `hasSupabase()` to decide whether to query DB
// or fall through to empty/seed-fallback paths in dev.

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function getDemoSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_DEMO_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_DEMO_ANON_KEY;
  return { url, anonKey };
}

export function hasSupabase(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export function hasDemoSupabase(): boolean {
  const { url, anonKey } = getDemoSupabaseEnv();
  return Boolean(url && anonKey);
}

export const DEMO_MODE_COOKIE = "shadow-mode";
export const DEMO_MODE_VALUE = "demo";
export const DEMO_USER_EMAIL =
  process.env.DEMO_USER_EMAIL ?? "demo@shadow.app";
