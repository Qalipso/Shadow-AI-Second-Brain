// Spotify Web API client — read-only, no audio streaming
// Required scopes: user-top-read user-read-recently-played

import type { SpotifyArtist, SpotifyTrack } from "@/types/music";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function buildSpotifyAuthUrl(state: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error("Spotify env vars missing.");

  const scopes = ["user-top-read", "user-read-recently-played"].join(" ");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    show_dialog: "false",
  });

  return `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify env vars missing.");
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify env vars missing.");

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token refresh failed: ${err}`);
  }

  return res.json();
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getTopArtists(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term",
  limit = 20,
): Promise<SpotifyArtist[]> {
  const data = await spotifyGet<{ items: SpotifyArtist[] }>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken,
  );
  return data.items ?? [];
}

export async function getTopTracks(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term",
  limit = 20,
): Promise<SpotifyTrack[]> {
  const data = await spotifyGet<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken,
  );
  return data.items ?? [];
}

export async function getRecentlyPlayed(
  accessToken: string,
  limit = 50,
): Promise<SpotifyTrack[]> {
  const data = await spotifyGet<{ items: Array<{ track: SpotifyTrack; played_at: string }> }>(
    `/me/player/recently-played?limit=${limit}`,
    accessToken,
  );
  return (data.items ?? []).map((item) => ({
    ...item.track,
    played_at: item.played_at,
  }));
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export async function fetchAllSpotifyData(accessToken: string) {
  const [
    topArtistsShort,
    topArtistsMedium,
    topArtistsLong,
    topTracksShort,
    topTracksMedium,
    topTracksLong,
    recentTracks,
  ] = await Promise.all([
    getTopArtists(accessToken, "short_term"),
    getTopArtists(accessToken, "medium_term"),
    getTopArtists(accessToken, "long_term"),
    getTopTracks(accessToken, "short_term"),
    getTopTracks(accessToken, "medium_term"),
    getTopTracks(accessToken, "long_term"),
    getRecentlyPlayed(accessToken),
  ]);

  return {
    topArtistsShort,
    topArtistsMedium,
    topArtistsLong,
    topTracksShort,
    topTracksMedium,
    topTracksLong,
    recentTracks,
  };
}
