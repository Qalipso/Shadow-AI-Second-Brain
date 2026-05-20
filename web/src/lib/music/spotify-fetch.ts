// Spotify API data fetchers — server-side only, raw fetch
// Uses Bearer token only, no client_secret required

import type { RawSpotifyArtist, RawSpotifyTrack, SpotifyUserProfile } from "@/types/spotify";
import { refreshAccessTokenPKCE } from "./pkce";
import { encryptToken, decryptToken } from "./crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

async function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  if (res.status === 401) throw new Error("SPOTIFY_UNAUTHORIZED");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getSpotifyProfile(accessToken: string): Promise<SpotifyUserProfile> {
  return spotifyGet("/me", accessToken);
}

export async function getTopArtists(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term",
  limit = 20,
): Promise<RawSpotifyArtist[]> {
  const data = await spotifyGet<{ items: RawSpotifyArtist[] }>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken,
  );
  return data.items ?? [];
}

export async function getTopTracks(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term",
  limit = 20,
): Promise<RawSpotifyTrack[]> {
  const data = await spotifyGet<{ items: RawSpotifyTrack[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken,
  );
  return data.items ?? [];
}

export async function getRecentlyPlayed(
  accessToken: string,
  limit = 50,
): Promise<Array<{ track: RawSpotifyTrack; played_at: string }>> {
  const data = await spotifyGet<{ items: Array<{ track: RawSpotifyTrack; played_at: string }> }>(
    `/me/player/recently-played?limit=${limit}`,
    accessToken,
  );
  return data.items ?? [];
}

// ─── Token management ─────────────────────────────────────────────────────────

/**
 * Get a valid (possibly refreshed) access token for the user.
 * Updates the DB if token was refreshed.
 * Returns null if no connection or refresh failed.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data: conn } = await supabase
    .from("spotify_connections")
    .select("access_token_enc, refresh_token_enc, token_expires_at, status")
    .eq("user_id", userId)
    .eq("status", "connected")
    .single();

  if (!conn?.access_token_enc) return null;

  let accessToken: string;
  try {
    accessToken = decryptToken(conn.access_token_enc);
  } catch {
    return null;
  }

  // Check expiry — refresh if <5 minutes left
  const expiresAt = new Date(conn.token_expires_at).getTime();
  const needsRefresh = expiresAt - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) return accessToken;
  if (!conn.refresh_token_enc) return null;

  let refreshToken: string;
  try {
    refreshToken = decryptToken(conn.refresh_token_enc);
  } catch {
    return null;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return null;

  try {
    const refreshed = await refreshAccessTokenPKCE({ refreshToken, clientId });
    const newAccessToken = refreshed.access_token;
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const newEnc = encryptToken(newAccessToken);

    await supabase
      .from("spotify_connections")
      .update({ access_token_enc: newEnc, token_expires_at: newExpiry })
      .eq("user_id", userId);

    return newAccessToken;
  } catch (e) {
    console.error("[spotify-fetch] refresh failed:", (e as Error).message);
    await supabase
      .from("spotify_connections")
      .update({ status: "error", error_message: "Token refresh failed." })
      .eq("user_id", userId);
    return null;
  }
}
