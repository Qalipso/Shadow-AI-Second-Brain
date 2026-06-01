// Sonic Mirror — SonicProfile assembler
// Single entry point that turns raw DB rows into a structured "adventure" profile:
// metrics + archetype + sound state + zones + party + confirmed labels.
// Pure: no IO. Feed it data loaded elsewhere.

import type { SpotifyArtistItem, SpotifyTrackItem, MusicMeaningLabel, MusicLabel } from "@/types/spotify";
import type { SpotifyArtist, SpotifyTrack, SonicArchetype, SoundState } from "@/types/music";
import { analyzeProfile } from "@/lib/music/analysis";
import { assignZones, type Zone } from "@/lib/music/zones";
import { roleForGenres, type RoleKey } from "@/lib/music/roles";
import { dominantVibe, vibeVectorForGenres, VIBES, ZERO_VIBE, type Vibe, type VibeVector } from "@/lib/music/vibe";

export type SonicConfidence = "inferred" | "confirmed";

export interface SonicMetrics {
  repeat: number;
  exploration: number;
  intensity: number;
  nostalgia: number;
  focus: number;
}

// Taste tension axes, each in [-1, 1]. Negative leans to the first pole,
// positive to the second. 0 = balanced.
export interface SonicTensions {
  controlChaos: number; // -1 control · +1 chaos
  stylePain: number;    // -1 style · +1 pain
  streetDigital: number; // -1 street · +1 digital
}

export interface PartyMember {
  id: string;
  name: string;
  imageUrl: string | null;
  rank: number;
  genres: string[];
  vibe: Vibe | null;
  role: RoleKey;
  labels: MusicLabel[];
}

export interface SonicProfile {
  confidence: SonicConfidence;
  metrics: SonicMetrics;
  tensions: SonicTensions;
  archetype: SonicArchetype;
  soundState: SoundState;
  zones: Zone[];
  party: PartyMember[];
  confirmedLabels: Record<string, MusicLabel[]>;
  artistCount: number;
  hasEnoughData: boolean;
}

const MIN_ARTISTS = 3;
const PARTY_SIZE = 6;

function artistItemToSpotifyArtist(item: SpotifyArtistItem): SpotifyArtist {
  return {
    id: item.spotify_artist_id,
    name: item.name,
    genres: item.genres,
    popularity: item.popularity,
    images: item.image_url ? [{ url: item.image_url }] : [],
  };
}

function trackItemToSpotifyTrack(item: SpotifyTrackItem): SpotifyTrack {
  return {
    id: item.spotify_track_id,
    name: item.name,
    artists: item.artist_names.map((name) => ({ id: name, name })),
    album: {
      id: item.album_name ?? "",
      name: item.album_name ?? "",
      images: item.image_url ? [{ url: item.image_url }] : [],
    },
    popularity: item.popularity,
    duration_ms: item.duration_ms,
  };
}

/** Group confirmed artist labels by spotify artist id. */
function groupArtistLabels(labels: readonly MusicMeaningLabel[]): Record<string, MusicLabel[]> {
  const out: Record<string, MusicLabel[]> = {};
  for (const l of labels) {
    if (l.item_type !== "artist") continue;
    const list = out[l.item_id] ?? [];
    if (!list.includes(l.label)) out[l.item_id] = [...list, l.label];
  }
  return out;
}

export interface SonicProfileInput {
  shortArtists: readonly SpotifyArtistItem[];
  longArtists?: readonly SpotifyArtistItem[];
  shortTracks?: readonly SpotifyTrackItem[];
  recentTracks?: readonly SpotifyTrackItem[];
  labels?: readonly MusicMeaningLabel[];
}

// Opposing pole ratio → [-1, 1]. 0 when both poles are empty.
function poles(a: number, b: number): number {
  const sum = a + b;
  if (sum <= 0) return 0;
  return (b - a) / sum;
}

// Derive the three taste-tension axes from aggregate vibe weights + metrics.
function computeTensions(vibeTotal: VibeVector, metrics: SonicMetrics): SonicTensions {
  const control = metrics.focus + metrics.repeat;
  const chaos = metrics.intensity + metrics.exploration;
  return {
    controlChaos: poles(control, chaos),
    stylePain: poles(vibeTotal.flex, vibeTotal.melancholy),
    streetDigital: poles(vibeTotal.street, vibeTotal.focus + vibeTotal.escape),
  };
}

export function buildSonicProfile(input: SonicProfileInput): SonicProfile {
  const {
    shortArtists,
    longArtists = [],
    shortTracks = [],
    recentTracks = [],
    labels = [],
  } = input;

  const analysis = analyzeProfile({
    topArtistsShort: shortArtists.map(artistItemToSpotifyArtist),
    topArtistsMedium: [],
    topArtistsLong: longArtists.map(artistItemToSpotifyArtist),
    topTracksShort: shortTracks.map(trackItemToSpotifyTrack),
    recentTracks: recentTracks.map(trackItemToSpotifyTrack),
  });

  const confirmedLabels = groupArtistLabels(labels);

  const zones = assignZones(
    shortArtists.map((a) => ({
      id: a.spotify_artist_id,
      name: a.name,
      genres: a.genres,
      imageUrl: a.image_url ?? null,
      rank: a.rank,
    })),
  );

  const party: PartyMember[] = shortArtists
    .slice(0, PARTY_SIZE)
    .map((a) => {
      const vibe = dominantVibe(vibeVectorForGenres(a.genres));
      return {
        id: a.spotify_artist_id,
        name: a.name,
        imageUrl: a.image_url ?? null,
        rank: a.rank,
        genres: a.genres,
        vibe,
        role: roleForGenres(a.genres),
        labels: confirmedLabels[a.spotify_artist_id] ?? [],
      };
    });

  // Aggregate vibe weights across all short-term artists for tension axes.
  const vibeTotal: VibeVector = shortArtists.reduce<VibeVector>((acc, a) => {
    const v = vibeVectorForGenres(a.genres);
    const next = { ...acc };
    for (const key of VIBES) next[key] += v[key];
    return next;
  }, { ...ZERO_VIBE });

  const metrics: SonicMetrics = {
    repeat: analysis.repeat_score,
    exploration: analysis.exploration_score,
    intensity: analysis.intensity_score,
    nostalgia: analysis.nostalgia_score,
    focus: analysis.focus_score,
  };

  return {
    confidence: labels.length > 0 ? "confirmed" : "inferred",
    metrics,
    tensions: computeTensions(vibeTotal, metrics),
    archetype: analysis.sonic_archetype,
    soundState: analysis.current_sound_state,
    zones,
    party,
    confirmedLabels,
    artistCount: shortArtists.length,
    hasEnoughData: shortArtists.length >= MIN_ARTISTS,
  };
}
