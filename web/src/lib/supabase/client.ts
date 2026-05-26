import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseEnv,
  getDemoSupabaseEnv,
  DEMO_MODE_COOKIE,
  DEMO_MODE_VALUE,
} from "./env";

// Browser client. Cached per-project URL to avoid creating multiple GoTrue instances.
// Reads `shadow-mode` cookie to pick prod vs demo Supabase project.
// Throws if env missing — only call this from client components that have
// already gated on auth (post-Phase 2.2).

const cache = new Map<string, ReturnType<typeof createBrowserClient>>();

function isDemoMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${DEMO_MODE_COOKIE}=${DEMO_MODE_VALUE}`));
}

export function createSupabaseBrowserClient() {
  const isDemo = isDemoMode();
  const { url: demoUrl, anonKey: demoKey } = getDemoSupabaseEnv();
  const { url: prodUrl, anonKey: prodKey } = getSupabaseEnv();

  const url = isDemo && demoUrl ? demoUrl : prodUrl;
  const anonKey = isDemo && demoKey ? demoKey : prodKey;

  if (!url || !anonKey) {
    throw new Error("Supabase env missing in browser client.");
  }

  const cached = cache.get(url);
  if (cached) return cached;

  const client = createBrowserClient(url, anonKey);
  cache.set(url, client);
  return client;
}
