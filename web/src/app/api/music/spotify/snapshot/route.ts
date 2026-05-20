import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MusicSnapshotSchema, SpotifyArtistItemSchema, SpotifyTrackItemSchema } from "@/types/spotify";
import type { SpotifyArtistItem, SpotifyTrackItem } from "@/types/spotify";
import { z } from "zod";

// GET /api/music/spotify/snapshot
// Returns latest snapshot + artists + tracks for display. No tokens.
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ snapshot: null, artists: {}, tracks: {}, mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [snapshotRes, artistsRes, tracksRes] = await Promise.all([
    supabase
      .from("music_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("spotify_artist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("rank", { ascending: true }),
    supabase
      .from("spotify_track_items")
      .select("*")
      .eq("user_id", user.id)
      .order("rank", { ascending: true }),
  ]);

  const snapshot = snapshotRes.data
    ? MusicSnapshotSchema.safeParse(snapshotRes.data).success
      ? MusicSnapshotSchema.parse(snapshotRes.data)
      : null
    : null;

  // Group by period
  const allArtists = (artistsRes.data ?? [])
    .map((r: unknown) => SpotifyArtistItemSchema.safeParse(r))
    .filter((p): p is { success: true; data: SpotifyArtistItem } => p.success)
    .map((p) => p.data);

  const allTracks = (tracksRes.data ?? [])
    .map((r: unknown) => SpotifyTrackItemSchema.safeParse(r))
    .filter((p): p is { success: true; data: SpotifyTrackItem } => p.success)
    .map((p) => p.data);

  const artists = {
    short_term: allArtists.filter((a) => a.period === "short_term"),
    medium_term: allArtists.filter((a) => a.period === "medium_term"),
    long_term: allArtists.filter((a) => a.period === "long_term"),
  };

  const tracks = {
    short_term: allTracks.filter((t) => t.period === "short_term"),
    medium_term: allTracks.filter((t) => t.period === "medium_term"),
    long_term: allTracks.filter((t) => t.period === "long_term"),
    recent: allTracks.filter((t) => t.period === "recent"),
  };

  return NextResponse.json({ snapshot, artists, tracks });
}
