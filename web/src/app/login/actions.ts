"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
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
  // If a session was issued immediately (email confirmations disabled in
  // Supabase dashboard), navigate. Otherwise wait for the email link.
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
