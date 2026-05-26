import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseEnv,
  getDemoSupabaseEnv,
  DEMO_MODE_COOKIE,
  DEMO_MODE_VALUE,
} from "./env";

// Server-side Supabase client.
// Reads cookies via Next 15+ async `cookies()`.
// If the `shadow-mode=demo` cookie is set, uses demo project credentials.
// Caller is responsible for guarding on `hasSupabase()` when env is optional.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get(DEMO_MODE_COOKIE)?.value === DEMO_MODE_VALUE;

  const { url: prodUrl, anonKey: prodKey } = getSupabaseEnv();
  const { url: demoUrl, anonKey: demoKey } = getDemoSupabaseEnv();

  const url = isDemo && demoUrl ? demoUrl : prodUrl;
  const anonKey = isDemo && demoKey ? demoKey : prodKey;

  if (!url || !anonKey) {
    throw new Error("Supabase env missing. Guard callers with hasSupabase().");
  }

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
