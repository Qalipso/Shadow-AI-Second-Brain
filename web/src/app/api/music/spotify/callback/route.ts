import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { encryptToken } from "@/lib/music/crypto";
import { exchangeCodePKCE } from "@/lib/music/pkce";

const APP = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007";

// GET /api/music/spotify/callback?code=...&state=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("sp_oauth_state")?.value;
  const codeVerifier = cookieStore.get("sp_pkce_verifier")?.value;

  // Clear cookies regardless of outcome
  cookieStore.delete("sp_oauth_state");
  cookieStore.delete("sp_pkce_verifier");

  const sonicUrl = `${APP()}/insights/sonic`;

  if (error) {
    return NextResponse.redirect(`${sonicUrl}?sp_error=denied`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${sonicUrl}?sp_error=invalid_callback`);
  }
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${sonicUrl}?sp_error=state_mismatch`);
  }
  if (!codeVerifier) {
    return NextResponse.redirect(`${sonicUrl}?sp_error=missing_verifier`);
  }
  if (!hasSupabase()) {
    return NextResponse.redirect(`${sonicUrl}?sp_error=db_unavailable`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${APP()}/login`);
  }

  // Exchange code for tokens (PKCE — no client_secret)
  let tokens: { access_token: string; refresh_token: string; expires_in: number; scope: string };
  try {
    tokens = await exchangeCodePKCE({
      code,
      codeVerifier,
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI!,
    });
  } catch (e) {
    console.error("[spotify/callback] token exchange:", (e as Error).message);
    return NextResponse.redirect(`${sonicUrl}?sp_error=token_exchange_failed`);
  }

  // Fetch Spotify user profile to get spotify_user_id
  let spotifyUserId: string | null = null;
  let spotifyDisplayName: string | null = null;
  try {
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json() as { id: string; display_name?: string };
      spotifyUserId = profile.id;
      spotifyDisplayName = profile.display_name ?? null;
    }
  } catch {
    // Non-fatal: we can still store the connection
  }

  // Encrypt tokens before DB storage
  let accessTokenEnc: string;
  let refreshTokenEnc: string | null = null;
  try {
    accessTokenEnc = encryptToken(tokens.access_token);
    if (tokens.refresh_token) {
      refreshTokenEnc = encryptToken(tokens.refresh_token);
    }
  } catch (e) {
    console.error("[spotify/callback] encrypt:", (e as Error).message);
    return NextResponse.redirect(`${sonicUrl}?sp_error=encrypt_failed`);
  }

  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const scopes = tokens.scope ? tokens.scope.split(" ") : [];

  const { error: dbErr } = await supabase
    .from("spotify_connections")
    .upsert(
      {
        user_id: user.id,
        status: "connected",
        spotify_user_id: spotifyUserId,
        spotify_display_name: spotifyDisplayName,
        access_token_enc: accessTokenEnc,
        refresh_token_enc: refreshTokenEnc,
        token_expires_at: tokenExpiresAt,
        scopes,
        connected_at: new Date().toISOString(),
        error_message: null,
      },
      { onConflict: "user_id" },
    );

  if (dbErr) {
    console.error("[spotify/callback] db upsert:", dbErr.message);
    return NextResponse.redirect(`${sonicUrl}?sp_error=db_write_failed`);
  }

  // Redirect to sync, which then redirects to Sonic Mirror
  return NextResponse.redirect(`${APP()}/api/music/spotify/sync?redirect=/insights/sonic&synced=1`);
}
