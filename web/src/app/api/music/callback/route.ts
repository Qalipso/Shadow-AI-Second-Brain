import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/music/spotify";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// GET /api/music/callback?code=...&state=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_BASE}/insights/sonic?error=spotify_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_BASE}/insights/sonic?error=invalid_callback`);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("sonic_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_BASE}/insights/sonic?error=state_mismatch`);
  }
  cookieStore.delete("sonic_oauth_state");

  if (!hasSupabase()) {
    return NextResponse.redirect(`${APP_BASE}/insights/sonic?error=db_unavailable`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${APP_BASE}/login`);
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch {
    return NextResponse.redirect(`${APP_BASE}/insights/sonic?error=token_exchange_failed`);
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: dbError } = await supabase
    .from("music_profiles")
    .upsert(
      {
        user_id: user.id,
        provider: "spotify",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

  if (dbError) {
    return NextResponse.redirect(`${APP_BASE}/insights/sonic?error=db_write_failed`);
  }

  // Trigger initial sync in background by redirecting to sync endpoint
  return NextResponse.redirect(`${APP_BASE}/api/music/sync?redirect=/insights/sonic`);
}
