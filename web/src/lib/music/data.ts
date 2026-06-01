import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MusicProfileSchema, EmotionalAnchorSchema, MusicInsightSchema } from "@/types/music";
import type { MusicProfile, EmotionalAnchor, MusicInsight, SpotifyArtist, SpotifyTrack } from "@/types/music";
import { analyzeProfile } from "@/lib/music/analysis";
import {
  SpotifyConnectionSchema,
  SpotifyArtistItemSchema,
  SpotifyTrackItemSchema,
  MusicSnapshotSchema,
  MusicMeaningLabelSchema,
  SonicReflectionSchema,
} from "@/types/spotify";
import type {
  SpotifyConnection,
  SpotifyArtistItem,
  SpotifyTrackItem,
  MusicSnapshot,
  MusicMeaningLabel,
  SonicReflection,
} from "@/types/spotify";

export async function getMusicProfile(userId: string): Promise<MusicProfile | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("music_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .single();
  if (data) {
    const parsed = MusicProfileSchema.safeParse(data);
    if (parsed.success) return parsed.data;
  }
  // Fallback: the current Spotify OAuth flow writes spotify_connections +
  // spotify_artist_items, NOT the legacy music_profiles table. When the legacy
  // row is absent, synthesize a profile from the live connection so compact
  // cards (Insights, Memory) reflect the real connected state.
  return buildProfileFromSpotifyConnection(supabase, userId);
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function buildProfileFromSpotifyConnection(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<MusicProfile | null> {
  const { data: conn } = await supabase
    .from("spotify_connections")
    .select("id,user_id,status,spotify_display_name,connected_at,last_synced_at")
    .eq("user_id", userId)
    .single();
  if (!conn || conn.status === "disconnected") return null;

  // Pull all artist periods + short/recent tracks so the deterministic analysis
  // engine (lib/music/analysis) can derive scores, archetype, and sound state.
  const [{ data: artistRows }, { data: trackRows }] = await Promise.all([
    supabase
      .from("spotify_artist_items")
      .select("spotify_artist_id,name,genres,popularity,image_url,period")
      .eq("user_id", userId)
      .order("rank", { ascending: true }),
    supabase
      .from("spotify_track_items")
      .select("spotify_track_id,name,artist_names,album_name,image_url,popularity,duration_ms,period")
      .eq("user_id", userId)
      .order("rank", { ascending: true }),
  ]);

  type ARow = {
    spotify_artist_id: string;
    name: string;
    genres: string[] | null;
    popularity: number | null;
    image_url: string | null;
    period: string;
  };
  type TRow = {
    spotify_track_id: string;
    name: string;
    artist_names: string[] | null;
    album_name: string | null;
    image_url: string | null;
    popularity: number | null;
    duration_ms: number | null;
    period: string;
  };

  const toArtist = (a: ARow): SpotifyArtist => ({
    id: a.spotify_artist_id,
    name: a.name,
    genres: a.genres ?? [],
    popularity: a.popularity ?? 0,
    images: a.image_url ? [{ url: a.image_url }] : [],
  });
  const toTrack = (t: TRow): SpotifyTrack => ({
    id: t.spotify_track_id,
    name: t.name,
    artists: (t.artist_names ?? []).map((n) => ({ id: "", name: n })),
    album: { id: "", name: t.album_name ?? "", images: t.image_url ? [{ url: t.image_url }] : [] },
    popularity: t.popularity ?? 0,
    duration_ms: t.duration_ms ?? 0,
  });

  const aRows = (artistRows ?? []) as ARow[];
  const tRows = (trackRows ?? []) as TRow[];
  const period = (p: string) => aRows.filter((r) => r.period === p).map(toArtist);

  const topArtistsShort = period("short_term");
  const topArtistsMedium = period("medium_term");
  const topArtistsLong = period("long_term");
  const topTracksShort = tRows.filter((r) => r.period === "short_term").map(toTrack);
  const recentTracks = tRows.filter((r) => r.period === "recent").map(toTrack);

  const analysis = analyzeProfile({
    topArtistsShort,
    topArtistsMedium,
    topArtistsLong,
    topTracksShort,
    recentTracks,
  });

  return {
    id: conn.id,
    user_id: conn.user_id,
    provider: "spotify",
    connected_at: conn.connected_at,
    last_synced_at: conn.last_synced_at ?? null,
    top_artists_short: topArtistsShort,
    top_artists_medium: topArtistsMedium,
    top_artists_long: topArtistsLong,
    top_tracks_short: topTracksShort,
    top_tracks_medium: [],
    top_tracks_long: [],
    recent_tracks: recentTracks,
    dominant_genres: analysis.dominant_genres,
    repeat_score: analysis.repeat_score,
    exploration_score: analysis.exploration_score,
    intensity_score: analysis.intensity_score,
    nostalgia_score: analysis.nostalgia_score,
    focus_score: analysis.focus_score,
    sonic_archetype: analysis.sonic_archetype,
    current_sound_state: analysis.current_sound_state,
    ai_summary: null,
  };
}

export async function getEmotionalAnchors(userId: string): Promise<EmotionalAnchor[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("emotional_anchors")
    .select("*")
    .eq("user_id", userId)
    .order("play_count", { ascending: false });
  return (data ?? [])
    .map((row: unknown) => EmotionalAnchorSchema.safeParse(row))
    .filter((p): p is { success: true; data: EmotionalAnchor } => p.success)
    .map((p) => p.data);
}

export async function getLatestMusicInsight(userId: string): Promise<MusicInsight | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("music_insights")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  const parsed = MusicInsightSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

// ─── Phase 2: Spotify Connect ─────────────────────────────────────────────────

export async function getSpotifyConnection(userId: string): Promise<SpotifyConnection | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("spotify_connections")
    .select("id,user_id,status,spotify_user_id,spotify_display_name,token_expires_at,scopes,connected_at,last_synced_at,error_message")
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  const parsed = SpotifyConnectionSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getSpotifyArtists(userId: string, period?: "short_term" | "medium_term" | "long_term"): Promise<SpotifyArtistItem[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("spotify_artist_items")
    .select("*")
    .eq("user_id", userId)
    .order("rank", { ascending: true });
  if (period) q = q.eq("period", period);
  const { data } = await q;
  return (data ?? [])
    .map((row: unknown) => SpotifyArtistItemSchema.safeParse(row))
    .filter((p): p is { success: true; data: SpotifyArtistItem } => p.success)
    .map((p) => p.data);
}

export async function getSpotifyTracks(userId: string, period?: "short_term" | "medium_term" | "long_term" | "recent"): Promise<SpotifyTrackItem[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("spotify_track_items")
    .select("*")
    .eq("user_id", userId)
    .order("rank", { ascending: true });
  if (period) q = q.eq("period", period);
  const { data } = await q;
  return (data ?? [])
    .map((row: unknown) => SpotifyTrackItemSchema.safeParse(row))
    .filter((p): p is { success: true; data: SpotifyTrackItem } => p.success)
    .map((p) => p.data);
}

export async function getLatestSnapshot(userId: string): Promise<MusicSnapshot | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("music_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  const parsed = MusicSnapshotSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getSnapshotHistory(userId: string, limit = 8): Promise<MusicSnapshot[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("music_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? [])
    .map((row: unknown) => MusicSnapshotSchema.safeParse(row))
    .filter((p): p is { success: true; data: MusicSnapshot } => p.success)
    .map((p) => p.data);
}

export async function getMusicMeaningLabels(userId: string): Promise<MusicMeaningLabel[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("music_meaning_labels")
    .select("*")
    .eq("user_id", userId)
    .order("confirmed_at", { ascending: false });
  return (data ?? [])
    .map((row: unknown) => MusicMeaningLabelSchema.safeParse(row))
    .filter((p): p is { success: true; data: MusicMeaningLabel } => p.success)
    .map((p) => p.data);
}

export async function getLatestSonicReflection(userId: string): Promise<SonicReflection | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("sonic_reflections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  const parsed = SonicReflectionSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
