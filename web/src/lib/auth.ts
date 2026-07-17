import "server-only";
import { cache } from "react";
import { hasSupabase } from "./supabase/env";
import { createSupabaseServerClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
};

// Returns the current user when Supabase is configured + a session is present.
// Returns `null` in dev mode (no env) or when unauthenticated — the proxy
// is the source of truth for protected-route gating.
//
// cache()-wrapped (issue #16) — proxy.ts, ~17 page.tsx files, and UserPill.tsx
// all independently called this per request with no dedup, unlike its sibling
// getSoulState (lib/souls/soulCore.ts) which already used this pattern.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
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
});
