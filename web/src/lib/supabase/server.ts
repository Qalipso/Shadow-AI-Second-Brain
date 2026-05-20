import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Server-side Supabase client.
// Reads cookies via Next 15+ async `cookies()`.
// Caller is responsible for guarding on `hasSupabase()` when env is optional.
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error("Supabase env missing. Guard callers with hasSupabase().");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components, setAll is a no-op (cookies are read-only there).
        // Route Handlers + Server Actions can mutate; wrap in try/catch.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Silently ignore in Server Component context.
        }
      },
    },
  });
}
