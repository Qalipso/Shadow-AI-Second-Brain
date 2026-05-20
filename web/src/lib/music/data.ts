import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MusicProfileSchema, EmotionalAnchorSchema, MusicInsightSchema } from "@/types/music";
import type { MusicProfile, EmotionalAnchor, MusicInsight } from "@/types/music";
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
  if (!data) return null;
  const parsed = MusicProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
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
