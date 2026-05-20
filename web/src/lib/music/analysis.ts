// Sonic Mirror — pattern analysis
// Converts raw Spotify data into psychological/behavioral scores and archetypes.

import type { SpotifyArtist, SpotifyTrack, SonicArchetype, SoundState } from "@/types/music";

// ─── Genre intensity lists ────────────────────────────────────────────────────

const HIGH_INTENSITY = [
  "metal", "punk", "hardcore", "trap", "drill", "hip-hop", "hip hop",
  "edm", "dubstep", "drum and bass", "techno", "industrial", "rave",
  "grindcore", "death metal", "black metal", "noise", "breakcore",
  "rage", "phonk", "aggressive", "war",
];

const LOW_INTENSITY = [
  "ambient", "classical", "jazz", "acoustic", "folk", "lo-fi", "lo fi",
  "chill", "soft", "slowcore", "dream", "shoegaze", "new age",
  "meditation", "sleep", "nature", "calm", "relaxing",
];

const FOCUS_GENRES = [
  "ambient", "instrumental", "classical", "lo-fi", "lo fi",
  "post-rock", "drone", "minimal", "study", "focus",
  "new age", "piano", "neoclassical", "cinematic", "soundtrack",
  "dark ambient", "space ambient",
];

// ─── Score calculators ────────────────────────────────────────────────────────

export function calcRepeatScore(recentTracks: SpotifyTrack[]): number {
  if (!recentTracks.length) return 0;
  const ids = recentTracks.map((t) => t.id);
  const unique = new Set(ids);
  const repeatRatio = 1 - unique.size / ids.length;
  return Math.round(repeatRatio * 100);
}

export function calcExplorationScore(artists: SpotifyArtist[]): number {
  if (!artists.length) return 50;
  const genres = new Set(artists.flatMap((a) => a.genres.map((g) => g.toLowerCase())));
  // Normalize: 30+ unique genres → 100
  return Math.min(100, Math.round((genres.size / 30) * 100));
}

export function calcIntensityScore(artists: SpotifyArtist[]): number {
  if (!artists.length) return 50;
  const genres = artists.flatMap((a) => a.genres.map((g) => g.toLowerCase()));
  if (!genres.length) return 50;

  let score = 50;
  for (const g of genres) {
    if (HIGH_INTENSITY.some((h) => g.includes(h))) score += 2;
    if (LOW_INTENSITY.some((l) => g.includes(l))) score -= 2;
  }
  return Math.max(0, Math.min(100, score));
}

export function calcNostalgiaScore(
  shortTermArtists: SpotifyArtist[],
  longTermArtists: SpotifyArtist[],
): number {
  if (!shortTermArtists.length || !longTermArtists.length) return 50;
  const longIds = new Set(longTermArtists.map((a) => a.id));
  const overlap = shortTermArtists.filter((a) => longIds.has(a.id)).length;
  // High nostalgia = short-term top artists match long-term (cycling old favorites)
  return Math.round((overlap / shortTermArtists.length) * 100);
}

export function calcFocusScore(artists: SpotifyArtist[]): number {
  if (!artists.length) return 0;
  const genres = artists.flatMap((a) => a.genres.map((g) => g.toLowerCase()));
  if (!genres.length) return 0;
  const matches = genres.filter((g) => FOCUS_GENRES.some((f) => g.includes(f)));
  // Weight: 1 match per 3 genre occurrences = focused
  return Math.min(100, Math.round((matches.length / Math.max(1, genres.length)) * 300));
}

// ─── Derived genre list ───────────────────────────────────────────────────────

export function extractDominantGenres(artists: SpotifyArtist[], top = 10): string[] {
  const freq = new Map<string, number>();
  for (const artist of artists) {
    for (const genre of artist.genres) {
      freq.set(genre, (freq.get(genre) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([g]) => g);
}

// ─── Archetype determination ──────────────────────────────────────────────────

export function determineSonicArchetype(scores: {
  repeat: number;
  exploration: number;
  intensity: number;
  nostalgia: number;
  focus: number;
}): SonicArchetype {
  const { repeat, exploration, intensity, nostalgia, focus } = scores;

  if (repeat > 70 && exploration < 30) return "the_ritual_listener";
  if (intensity > 75 && repeat > 60 && nostalgia < 40) return "the_war_mode_strategist";
  if (exploration > 65 && intensity > 60) return "the_chaos_alchemist";
  if (focus > 55 && intensity > 55 && exploration < 50) return "the_night_builder";
  if (nostalgia > 70 && intensity < 40) return "the_melancholy_operator";
  if (nostalgia > 60 && intensity < 55) return "the_soft_escapist";
  return "the_restless_romantic";
}

// ─── Current sound state ──────────────────────────────────────────────────────

export function determineCurrentSoundState(scores: {
  repeat: number;
  exploration: number;
  intensity: number;
  nostalgia: number;
  focus: number;
}): SoundState {
  const { repeat, exploration, intensity, nostalgia, focus } = scores;

  if (focus > 60 && intensity < 50) return "dark_focus";
  if (intensity > 75 && exploration > 45) return "restless_energy";
  if (intensity < 35 && focus > 45) return "soft_recovery";
  if (repeat > 70 && nostalgia > 60) return "nostalgic_loop";
  if (intensity > 80) return "aggressive_momentum";
  if (nostalgia > 65 && intensity > 45) return "romantic_drift";
  if (exploration > 60 && intensity > 55) return "creative_chaos";
  return "dark_focus";
}

// ─── Detect emotional anchor candidates ──────────────────────────────────────

export function detectRepeatAnchors(
  recentTracks: SpotifyTrack[],
  shortTracks: SpotifyTrack[],
  minPlays = 3,
): Array<{ trackId: string; trackName: string; artistName: string; albumArt: string; playCount: number }> {
  const freq = new Map<string, { track: SpotifyTrack; count: number }>();

  for (const t of [...recentTracks, ...shortTracks]) {
    const entry = freq.get(t.id);
    if (entry) {
      entry.count++;
    } else {
      freq.set(t.id, { track: t, count: 1 });
    }
  }

  return [...freq.values()]
    .filter((e) => e.count >= minPlays)
    .sort((a, b) => b.count - a.count)
    .map((e) => ({
      trackId: e.track.id,
      trackName: e.track.name,
      artistName: e.track.artists[0]?.name ?? "Unknown",
      albumArt: e.track.album?.images?.[0]?.url ?? "",
      playCount: e.count,
    }));
}

// ─── Full analysis pipeline ───────────────────────────────────────────────────

export function analyzeProfile(data: {
  topArtistsShort: SpotifyArtist[];
  topArtistsMedium: SpotifyArtist[];
  topArtistsLong: SpotifyArtist[];
  topTracksShort: SpotifyTrack[];
  recentTracks: SpotifyTrack[];
}) {
  const allArtists = [...data.topArtistsShort, ...data.topArtistsMedium, ...data.topArtistsLong];

  const repeat_score = calcRepeatScore(data.recentTracks);
  const exploration_score = calcExplorationScore(allArtists);
  const intensity_score = calcIntensityScore(data.topArtistsShort);
  const nostalgia_score = calcNostalgiaScore(data.topArtistsShort, data.topArtistsLong);
  const focus_score = calcFocusScore(data.topArtistsShort);

  const scores = { repeat: repeat_score, exploration: exploration_score, intensity: intensity_score, nostalgia: nostalgia_score, focus: focus_score };

  return {
    repeat_score,
    exploration_score,
    intensity_score,
    nostalgia_score,
    focus_score,
    dominant_genres: extractDominantGenres(allArtists),
    sonic_archetype: determineSonicArchetype(scores),
    current_sound_state: determineCurrentSoundState(scores),
  };
}
