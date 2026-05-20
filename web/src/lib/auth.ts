import "server-only";
import { hasSupabase } from "./supabase/env";
import { createSupabaseServerClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
};

// Returns the current user when Supabase is configured + a session is present.
// Returns `null` in dev mode (no env) or when unauthenticated — the proxy
// is the source of truth for protected-route gating.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasSupabase()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch (e) {
    console.error("[auth:getCurrentUser]", (e as Error).message);
    return null;
  }
}
