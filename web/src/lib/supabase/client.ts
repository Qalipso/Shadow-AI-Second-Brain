import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Browser client. Cached per-tab to avoid creating multiple GoTrue instances.
// Throws if env missing — only call this from client components that have
// already gated on auth (post-Phase 2.2).
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error("Supabase env missing in browser client.");
  }
  cached = createBrowserClient(url, anonKey);
  return cached;
}
