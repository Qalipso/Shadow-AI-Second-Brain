import { NextRequest, NextResponse } from "next/server";
import { fetchAllSpotifyData, refreshAccessToken } from "@/lib/music/spotify";
import { analyzeProfile, detectRepeatAnchors } from "@/lib/music/analysis";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// GET /api/music/sync?redirect=/path
// POST /api/music/sync (JSON body, no redirect)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") ?? "/insights/sonic";

  const result = await runSync();
  if (result.error) {
    return NextResponse.redirect(`${APP_BASE}${redirectTo}?error=${result.error}`);
  }
  return NextResponse.redirect(`${APP_BASE}${redirectTo}?synced=1`);
}

export async function POST() {
  const result = await runSync();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function runSync(): Promise<{ error?: string }> {
  if (!hasSupabase()) return { error: "db_unavailable" };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  // Load existing profile
  const { data: profile } = await supabase
    .from("music_profiles")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .eq("provider", "spotify")
    .single();

  if (!profile?.access_token) return { error: "not_connected" };

  let accessToken = profile.access_token;

  // Refresh token if expired or expiring in <5 min
  if (profile.token_expires_at) {
    const expiresAt = new Date(profile.token_expires_at).getTime();
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      if (!profile.refresh_token) return { error: "no_refresh_token" };
      try {
        const refreshed = await refreshAccessToken(profile.refresh_token);
        accessToken = refreshed.access_token;
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        await supabase
          .from("music_profiles")
          .update({ access_token: accessToken, token_expires_at: newExpiry })
          .eq("user_id", user.id)
          .eq("provider", "spotify");
      } catch {
        return { error: "token_refresh_failed" };
      }
    }
  }

  // Fetch all Spotify data
  let spotifyData;
  try {
    spotifyData = await fetchAllSpotifyData(accessToken);
  } catch {
    return { error: "spotify_fetch_failed" };
  }

  // Analyze patterns
  const analysis = analyzeProfile({
    topArtistsShort: spotifyData.topArtistsShort,
    topArtistsMedium: spotifyData.topArtistsMedium,
    topArtistsLong: spotifyData.topArtistsLong,
    topTracksShort: spotifyData.topTracksShort,
    recentTracks: spotifyData.recentTracks,
  });

  // Update profile with new data
  const { error: updateError } = await supabase
    .from("music_profiles")
    .update({
      top_artists_short: spotifyData.topArtistsShort,
      top_artists_medium: spotifyData.topArtistsMedium,
      top_artists_long: spotifyData.topArtistsLong,
      top_tracks_short: spotifyData.topTracksShort,
      top_tracks_medium: spotifyData.topTracksMedium,
      top_tracks_long: spotifyData.topTracksLong,
      recent_tracks: spotifyData.recentTracks,
      dominant_genres: analysis.dominant_genres,
      repeat_score: analysis.repeat_score,
      exploration_score: analysis.exploration_score,
      intensity_score: analysis.intensity_score,
      nostalgia_score: analysis.nostalgia_score,
      focus_score: analysis.focus_score,
      sonic_archetype: analysis.sonic_archetype,
      current_sound_state: analysis.current_sound_state,
      last_synced_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("provider", "spotify");

  if (updateError) return { error: "db_update_failed" };

  // Upsert emotional anchor candidates (tracks played 3+ times)
  const anchors = detectRepeatAnchors(spotifyData.recentTracks, spotifyData.topTracksShort);
  if (anchors.length) {
    const anchorRows = anchors.map((a) => ({
      user_id: user.id,
      track_id: a.trackId,
      track_name: a.trackName,
      artist_name: a.artistName,
      album_art_url: a.albumArt,
      play_count: a.playCount,
      updated_at: new Date().toISOString(),
    }));

    await supabase
      .from("emotional_anchors")
      .upsert(anchorRows, { onConflict: "user_id,track_id", ignoreDuplicates: false });
  }

  return {};
}
