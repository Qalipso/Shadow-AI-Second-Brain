import { z } from "zod";

// ─── Spotify API raw shapes ───────────────────────────────────────────────────

export const SpotifyUserProfileSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable().optional(),
  email: z.string().optional(),
  images: z.array(z.object({ url: z.string() })).optional(),
});
export type SpotifyUserProfile = z.infer<typeof SpotifyUserProfileSchema>;

export const RawSpotifyArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()).default([]),
  popularity: z.number().default(0),
  images: z.array(z.object({ url: z.string(), width: z.number().optional(), height: z.number().optional() })).default([]),
  external_urls: z.object({ spotify: z.string().optional() }).optional(),
});
export type RawSpotifyArtist = z.infer<typeof RawSpotifyArtistSchema>;

export const RawSpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(z.object({ id: z.string(), name: z.string() })),
  album: z.object({
    id: z.string(),
    name: z.string(),
    images: z.array(z.object({ url: z.string() })).default([]),
  }),
  duration_ms: z.number().default(0),
  popularity: z.number().default(0),
  external_urls: z.object({ spotify: z.string().optional() }).optional(),
});
export type RawSpotifyTrack = z.infer<typeof RawSpotifyTrackSchema>;

// ─── DB schemas ───────────────────────────────────────────────────────────────

export const SpotifyConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(["connected", "disconnected", "error"]),
  spotify_user_id: z.string().nullable().optional(),
  spotify_display_name: z.string().nullable().optional(),
  token_expires_at: z.string(),
  scopes: z.array(z.string()).default([]),
  connected_at: z.string(),
  last_synced_at: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  // tokens intentionally excluded from client-facing schema
});
export type SpotifyConnection = z.infer<typeof SpotifyConnectionSchema>;

export const SpotifyArtistItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  spotify_artist_id: z.string(),
  name: z.string(),
  genres: z.array(z.string()).default([]),
  popularity: z.number().default(0),
  image_url: z.string().nullable().optional(),
  spotify_url: z.string().nullable().optional(),
  period: z.enum(["short_term", "medium_term", "long_term"]),
  rank: z.number().int(),
  fetched_at: z.string(),
});
export type SpotifyArtistItem = z.infer<typeof SpotifyArtistItemSchema>;

export const SpotifyTrackItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  spotify_track_id: z.string(),
  name: z.string(),
  artist_names: z.array(z.string()).default([]),
  album_name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  spotify_url: z.string().nullable().optional(),
  duration_ms: z.number().default(0),
  popularity: z.number().default(0),
  period: z.enum(["short_term", "medium_term", "long_term", "recent"]),
  rank: z.number().int(),
  played_at: z.string().nullable().optional(),
  fetched_at: z.string(),
});
export type SpotifyTrackItem = z.infer<typeof SpotifyTrackItemSchema>;

export const MusicSnapshotSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: z.string().default("spotify"),
  repeated_artists: z.array(z.object({
    id: z.string(),
    name: z.string(),
    image_url: z.string().optional(),
  })).default([]),
  repeated_tracks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    artist_names: z.array(z.string()),
    image_url: z.string().optional(),
    play_count: z.number().default(1),
  })).default([]),
  dominant_genres: z.array(z.string()).default([]),
  short_vs_long_shift: z.enum(["stable", "shifting", "gradual"]).default("stable"),
  created_at: z.string(),
});
export type MusicSnapshot = z.infer<typeof MusicSnapshotSchema>;

// ─── Labels ───────────────────────────────────────────────────────────────────

export const MUSIC_LABELS = [
  "Focus", "Power", "Pain", "Love", "Nostalgia", "Escape",
  "Recovery", "Chaos", "Confidence", "Memory", "Sensuality",
  "Peace", "Tension", "Joy",
] as const;
export type MusicLabel = typeof MUSIC_LABELS[number];

export const MusicMeaningLabelSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  item_type: z.enum(["artist", "track"]),
  item_id: z.string(),
  item_name: z.string(),
  artist_name: z.string().nullable().optional(),
  label: z.enum(MUSIC_LABELS),
  user_note: z.string().nullable().optional(),
  confirmed_at: z.string(),
});
export type MusicMeaningLabel = z.infer<typeof MusicMeaningLabelSchema>;

// ─── Sonic Reflection ─────────────────────────────────────────────────────────

export const SonicReflectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  patterns: z.array(z.string()).default([]),
  possible_meanings: z.array(z.string()).default([]),
  linked_life_areas: z.array(z.string()).default([]),
  confidence: z.enum(["low", "medium", "high"]).default("low"),
  user_question: z.string().nullable().optional(),
  input_label_count: z.number().default(0),
  created_at: z.string(),
});
export type SonicReflection = z.infer<typeof SonicReflectionSchema>;

// ─── Display helpers ──────────────────────────────────────────────────────────

export const LABEL_META: Record<MusicLabel, { color: string; valence: "pleasant" | "unpleasant" | "mixed"; arousal: "calm" | "activated" | "mixed" }> = {
  Focus:      { color: "rgba(109,123,255,0.75)", valence: "pleasant",   arousal: "calm"      },
  Power:      { color: "rgba(224,178,92,0.80)",  valence: "pleasant",   arousal: "activated" },
  Pain:       { color: "rgba(172,82,101,0.70)",  valence: "unpleasant", arousal: "mixed"     },
  Love:       { color: "rgba(201,163,106,0.75)", valence: "pleasant",   arousal: "mixed"     },
  Nostalgia:  { color: "rgba(126,87,194,0.70)",  valence: "mixed",      arousal: "calm"      },
  Escape:     { color: "rgba(113,179,139,0.65)", valence: "pleasant",   arousal: "calm"      },
  Recovery:   { color: "rgba(113,179,139,0.60)", valence: "pleasant",   arousal: "calm"      },
  Chaos:      { color: "rgba(172,82,101,0.55)",  valence: "unpleasant", arousal: "activated" },
  Confidence: { color: "rgba(224,178,92,0.65)",  valence: "pleasant",   arousal: "activated" },
  Memory:     { color: "rgba(126,87,194,0.55)",  valence: "mixed",      arousal: "calm"      },
  Sensuality: { color: "rgba(201,163,106,0.60)", valence: "pleasant",   arousal: "mixed"     },
  Peace:      { color: "rgba(109,123,255,0.55)", valence: "pleasant",   arousal: "calm"      },
  Tension:    { color: "rgba(172,82,101,0.60)",  valence: "unpleasant", arousal: "activated" },
  Joy:        { color: "rgba(113,179,139,0.80)", valence: "pleasant",   arousal: "activated" },
};

export const CONFIDENCE_META: Record<"low" | "medium" | "high", { label: string; note: string; color: string }> = {
  low:    { label: "Low confidence",    note: "Based on listening patterns only. Confirm labels for deeper accuracy.", color: "rgba(172,82,101,0.6)"  },
  medium: { label: "Medium confidence", note: "Based on confirmed labels.",                                           color: "rgba(224,178,92,0.7)"  },
  high:   { label: "High confidence",   note: "Labels confirmed and aligned with recent check-in data.",             color: "rgba(113,179,139,0.7)" },
};
