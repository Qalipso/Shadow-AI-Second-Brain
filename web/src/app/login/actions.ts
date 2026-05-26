"use server";

import { headers, cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasSupabase,
  hasDemoSupabase,
  getSupabaseEnv,
  getDemoSupabaseEnv,
  DEMO_MODE_COOKIE,
  DEMO_MODE_VALUE,
  DEMO_USER_EMAIL,
} from "@/lib/supabase/env";
import { safeRedirect } from "@/lib/safe-redirect";

// Server actions for /login.
// We DO NOT call `redirect()` here. `useActionState` + `redirect()` interact
// poorly in Next 16 / React 19 (the NEXT_REDIRECT throw surfaces as a generic
// "Unexpected response" error). Instead, return `{ next }` and let the client
// navigate via `router.replace` after the action resolves.

export type LoginState = {
  error?: string;
  info?: string;
  next?: string;
} | null;

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3007";
  return `${proto}://${host}`;
}

// Creates a Supabase client for login with explicit mode (cannot read cookie
// yet since the cookie is set in the same request).
async function createLoginClient(isDemo: boolean) {
  const { url: demoUrl, anonKey: demoKey } = getDemoSupabaseEnv();
  const { url: prodUrl, anonKey: prodKey } = getSupabaseEnv();
  const url = isDemo && demoUrl ? demoUrl : prodUrl;
  const anonKey = isDemo && demoKey ? demoKey : prodKey;
  if (!url || !anonKey) throw new Error("Supabase env missing.");
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch { /* Server Component context */ }
      },
    },
  });
}

async function setDemoModeCookie(isDemo: boolean) {
  const cookieStore = await cookies();
  if (isDemo) {
    cookieStore.set(DEMO_MODE_COOKIE, DEMO_MODE_VALUE, {
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // browser JS reads it to pick the right Supabase client
    });
  } else {
    cookieStore.delete(DEMO_MODE_COOKIE);
  }
}

export async function signInWithPassword(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!hasSupabase()) {
    return {
      error:
        "Supabase env missing. Add NEXT_PUBLIC_SUPABASE_* to .env.local.",
    };
  }

  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeRedirect(formData.get("redirect_to"));

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }
  if (!email.includes("@") || password.length < 6) {
    return { error: "Provide a valid email and password (≥ 6 chars)." };
  }

  const isDemo =
    hasDemoSupabase() &&
    email.toLowerCase().trim() === DEMO_USER_EMAIL.toLowerCase().trim();

  const supabase = await createLoginClient(isDemo);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  await setDemoModeCookie(isDemo);
  return { next };
}

export async function signUpWithPassword(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!hasSupabase()) {
    return { error: "Supabase env missing." };
  }

  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeRedirect(formData.get("redirect_to"));

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }
  if (!email.includes("@") || password.length < 8) {
    return { error: "Password must be ≥ 8 chars." };
  }

  const origin = await originFromHeaders();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: error.message };
  }
  if (data.session) {
    return { next };
  }
  return { info: "Check your inbox to confirm the account." };
}

export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!hasSupabase()) {
    return { error: "Supabase env missing." };
  }

  const email = formData.get("email");
  const next = safeRedirect(formData.get("redirect_to"));

  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Provide a valid email." };
  }

  const origin = await originFromHeaders();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: error.message };
  }
  return { info: "Magic link sent. Check your inbox." };
}
