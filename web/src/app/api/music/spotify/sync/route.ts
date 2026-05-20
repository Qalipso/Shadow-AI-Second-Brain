import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  getValidAccessToken,
  getTopArtists,
  getTopTracks,
  getRecentlyPlayed,
} from "@/lib/music/spotify-fetch";
import type { RawSpotifyArtist, RawSpotifyTrack } from "@/types/spotify";

const APP = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007";

// GET /api/music/spotify/sync?redirect=/path — sync then redirect
// POST /api/music/spotify/sync — sync, return JSON
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") ?? "/insights/sonic";
  const synced = searchParams.get("synced");

  const result = await runSync();
  const suffix = synced ? `&synced=${synced}` : "";

  if (result.error) {
    return NextResponse.redirect(`${APP()}${redirectTo}?sp_error=${result.error}${suffix}`);
  }
  return NextResponse.redirect(`${APP()}${redirectTo}?sp_synced=1${suffix}`);
}

export async function POST() {
  const result = await runSync();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ ok: true });
}

// ─── Core sync logic ──────────────────────────────────────────────────────────

async function runSync(): Promise<{ error?: string; status?: number }> {
  if (!hasSupabase()) return { error: "db_unavailable", status: 503 };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", status: 401 };

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) return { error: "not_connected", status: 404 };

  // Fetch all Spotify data in parallel
  let topArtistsShort: RawSpotifyArtist[];
  let topArtistsMedium: RawSpotifyArtist[];
  let topArtistsLong: RawSpotifyArtist[];
  let topTracksShort: RawSpotifyTrack[];
  let topTracksMedium: RawSpotifyTrack[];
  let topTracksLong: RawSpotifyTrack[];
  let recentlyPlayed: Array<{ track: RawSpotifyTrack; played_at: string }>;

  try {
    [
      topArtistsShort, topArtistsMedium, topArtistsLong,
      topTracksShort, topTracksMedium, topTracksLong,
      recentlyPlayed,
    ] = await Promise.all([
      getTopArtists(accessToken, "short_term"),
      getTopArtists(accessToken, "medium_term"),
      getTopArtists(accessToken, "long_term"),
      getTopTracks(accessToken, "short_term"),
      getTopTracks(accessToken, "medium_term"),
      getTopTracks(accessToken, "long_term"),
      getRecentlyPlayed(accessToken, 50),
    ]);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "SPOTIFY_UNAUTHORIZED") {
      await supabase
        .from("spotify_connections")
        .update({ status: "error", error_message: "Access revoked by user." })
        .eq("user_id", user.id);
      return { error: "spotify_unauthorized", status: 401 };
    }
    console.error("[spotify/sync] fetch:", msg);
    return { error: "spotify_fetch_failed", status: 502 };
  }

  // Upsert artist items
  const artistRows = [
    ...topArtistsShort.map((a, i) => toArtistRow(user.id, a, "short_term", i + 1)),
    ...topArtistsMedium.map((a, i) => toArtistRow(user.id, a, "medium_term", i + 1)),
    ...topArtistsLong.map((a, i) => toArtistRow(user.id, a, "long_term", i + 1)),
  ];
  if (artistRows.length) {
    const { error: ae } = await supabase
      .from("spotify_artist_items")
      .upsert(artistRows, { onConflict: "user_id,spotify_artist_id,period" });
    if (ae) console.error("[spotify/sync] artist upsert:", ae.message);
  }

  // Upsert track items
  const trackRows = [
    ...topTracksShort.map((t, i) => toTrackRow(user.id, t, "short_term", i + 1, null)),
    ...topTracksMedium.map((t, i) => toTrackRow(user.id, t, "medium_term", i + 1, null)),
    ...topTracksLong.map((t, i) => toTrackRow(user.id, t, "long_term", i + 1, null)),
    ...recentlyPlayed.map((item, i) => toTrackRow(user.id, item.track, "recent", i + 1, item.played_at)),
  ];
  if (trackRows.length) {
    const { error: te } = await supabase
      .from("spotify_track_items")
      .upsert(trackRows, { onConflict: "user_id,spotify_track_id,period" });
    if (te) console.error("[spotify/sync] track upsert:", te.message);
  }

  // Compute snapshot aggregations
  const dominantGenres = computeDominantGenres([
    ...topArtistsShort, ...topArtistsMedium, ...topArtistsLong,
  ]);
  const repeatedArtists = computeRepeatedArtists(topArtistsShort, topArtistsLong);
  const repeatedTracks = computeRepeatedTracks(recentlyPlayed.map(r => r.track));
  const shift = computeShift(topArtistsShort, topArtistsLong);

  const { error: se } = await supabase
    .from("music_snapshots")
    .insert({
      user_id: user.id,
      provider: "spotify",
      repeated_artists: repeatedArtists,
      repeated_tracks: repeatedTracks,
      dominant_genres: dominantGenres,
      short_vs_long_shift: shift,
      created_at: new Date().toISOString(),
    });
  if (se) console.error("[spotify/sync] snapshot insert:", se.message);

  // Update connection sync time
  await supabase
    .from("spotify_connections")
    .update({ last_synced_at: new Date().toISOString(), error_message: null })
    .eq("user_id", user.id);

  return {};
}

// ─── Row builders ─────────────────────────────────────────────────────────────

function toArtistRow(
  userId: string,
  a: RawSpotifyArtist,
  period: "short_term" | "medium_term" | "long_term",
  rank: number,
) {
  return {
    user_id: userId,
    spotify_artist_id: a.id,
    name: a.name,
    genres: a.genres ?? [],
    popularity: a.popularity ?? 0,
    image_url: a.images?.[0]?.url ?? null,
    spotify_url: a.external_urls?.spotify ?? null,
    period,
    rank,
    fetched_at: new Date().toISOString(),
  };
}

function toTrackRow(
  userId: string,
  t: RawSpotifyTrack,
  period: "short_term" | "medium_term" | "long_term" | "recent",
  rank: number,
  playedAt: string | null,
) {
  return {
    user_id: userId,
    spotify_track_id: t.id,
    name: t.name,
    artist_names: t.artists.map((a) => a.name),
    album_name: t.album?.name ?? null,
    image_url: t.album?.images?.[0]?.url ?? null,
    spotify_url: t.external_urls?.spotify ?? null,
    duration_ms: t.duration_ms ?? 0,
    popularity: t.popularity ?? 0,
    period,
    rank,
    played_at: playedAt,
    fetched_at: new Date().toISOString(),
  };
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function computeDominantGenres(artists: RawSpotifyArtist[], top = 10): string[] {
  const freq = new Map<string, number>();
  for (const a of artists) {
    for (const g of (a.genres ?? [])) {
      freq.set(g, (freq.get(g) ?? 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([g]) => g);
}

function computeRepeatedArtists(
  short: RawSpotifyArtist[],
  long: RawSpotifyArtist[],
): Array<{ id: string; name: string; image_url?: string }> {
  const longIds = new Set(long.map((a) => a.id));
  return short
    .filter((a) => longIds.has(a.id))
    .slice(0, 5)
    .map((a) => ({ id: a.id, name: a.name, image_url: a.images?.[0]?.url }));
}

function computeRepeatedTracks(
  recent: RawSpotifyTrack[],
): Array<{ id: string; name: string; artist_names: string[]; image_url?: string; play_count: number }> {
  const freq = new Map<string, { track: RawSpotifyTrack; count: number }>();
  for (const t of recent) {
    const e = freq.get(t.id);
    if (e) e.count++;
    else freq.set(t.id, { track: t, count: 1 });
  }
  return [...freq.values()]
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((e) => ({
      id: e.track.id,
      name: e.track.name,
      artist_names: e.track.artists.map((a) => a.name),
      image_url: e.track.album?.images?.[0]?.url,
      play_count: e.count,
    }));
}

function computeShift(
  short: RawSpotifyArtist[],
  long: RawSpotifyArtist[],
): "stable" | "shifting" | "gradual" {
  if (!short.length || !long.length) return "stable";
  const longIds = new Set(long.map((a) => a.id));
  const overlap = short.filter((a) => longIds.has(a.id)).length;
  const ratio = overlap / Math.min(short.length, 10);
  if (ratio >= 0.6) return "stable";
  if (ratio >= 0.3) return "gradual";
  return "shifting";
}
