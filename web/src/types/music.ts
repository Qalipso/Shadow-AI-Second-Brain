import { z } from "zod";

// ─── Spotify raw shapes ───────────────────────────────────────────────────────

export const SpotifyImageSchema = z.object({
  url: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export const SpotifyArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()).default([]),
  popularity: z.number().default(0),
  images: z.array(SpotifyImageSchema).default([]),
});
export type SpotifyArtist = z.infer<typeof SpotifyArtistSchema>;

export const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(z.object({ id: z.string(), name: z.string() })),
  album: z.object({
    id: z.string(),
    name: z.string(),
    images: z.array(SpotifyImageSchema).default([]),
  }),
  popularity: z.number().default(0),
  duration_ms: z.number().default(0),
  played_at: z.string().optional(), // only on recently played
});
export type SpotifyTrack = z.infer<typeof SpotifyTrackSchema>;

// ─── Computed / derived ───────────────────────────────────────────────────────

export const SoundStateSchema = z.enum([
  "dark_focus",
  "restless_energy",
  "soft_recovery",
  "romantic_drift",
  "aggressive_momentum",
  "nostalgic_loop",
  "creative_chaos",
]);
export type SoundState = z.infer<typeof SoundStateSchema>;

export const SonicArchetypeSchema = z.enum([
  "the_night_builder",
  "the_restless_romantic",
  "the_war_mode_strategist",
  "the_soft_escapist",
  "the_chaos_alchemist",
  "the_melancholy_operator",
  "the_ritual_listener",
]);
export type SonicArchetype = z.infer<typeof SonicArchetypeSchema>;

export const UserMeaningSchema = z.enum([
  "focus",
  "pain",
  "power",
  "love",
  "nostalgia",
  "escape",
  "recovery",
  "chaos",
]);
export type UserMeaning = z.infer<typeof UserMeaningSchema>;

// ─── DB schemas ───────────────────────────────────────────────────────────────

export const MusicProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: z.string().default("spotify"),
  access_token: z.string().nullable().optional(),
  refresh_token: z.string().nullable().optional(),
  token_expires_at: z.string().nullable().optional(),
  connected_at: z.string(),
  last_synced_at: z.string().nullable().optional(),
  top_artists_short: z.array(SpotifyArtistSchema).default([]),
  top_artists_medium: z.array(SpotifyArtistSchema).default([]),
  top_artists_long: z.array(SpotifyArtistSchema).default([]),
  top_tracks_short: z.array(SpotifyTrackSchema).default([]),
  top_tracks_medium: z.array(SpotifyTrackSchema).default([]),
  top_tracks_long: z.array(SpotifyTrackSchema).default([]),
  recent_tracks: z.array(SpotifyTrackSchema).default([]),
  dominant_genres: z.array(z.string()).default([]),
  repeat_score: z.number().default(0),
  exploration_score: z.number().default(0),
  intensity_score: z.number().default(0),
  nostalgia_score: z.number().default(0),
  focus_score: z.number().default(0),
  sonic_archetype: SonicArchetypeSchema.nullable().optional(),
  current_sound_state: SoundStateSchema.nullable().optional(),
  ai_summary: z.string().nullable().optional(),
});
export type MusicProfile = z.infer<typeof MusicProfileSchema>;

export const MusicInsightSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  period: z.string().default("weekly"),
  title: z.string().nullable(),
  description: z.string().nullable(),
  linked_life_areas: z.array(z.string()).default([]),
  linked_mood: z.string().nullable().optional(),
  confidence: z.number().default(0.7),
  created_at: z.string(),
});
export type MusicInsight = z.infer<typeof MusicInsightSchema>;

export const EmotionalAnchorSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  track_id: z.string(),
  track_name: z.string(),
  artist_name: z.string(),
  album_art_url: z.string().nullable().optional(),
  user_meaning: UserMeaningSchema.nullable().optional(),
  detected_pattern: z.string().nullable().optional(),
  linked_life_areas: z.array(z.string()).default([]),
  play_count: z.number().default(1),
  first_seen_at: z.string(),
  updated_at: z.string().optional(),
});
export type EmotionalAnchor = z.infer<typeof EmotionalAnchorSchema>;

// ─── Display helpers ──────────────────────────────────────────────────────────

export const SOUND_STATE_META: Record<SoundState, { label: string; color: string; description: string }> = {
  dark_focus: {
    label: "Dark Focus",
    color: "rgba(109, 123, 255, 0.75)",
    description: "Inward, concentrated. Blocking out noise.",
  },
  restless_energy: {
    label: "Restless Energy",
    color: "rgba(224, 178, 92, 0.85)",
    description: "High movement, seeking stimulation.",
  },
  soft_recovery: {
    label: "Soft Recovery",
    color: "rgba(113, 179, 139, 0.75)",
    description: "Slowing down. Processing something quietly.",
  },
  romantic_drift: {
    label: "Romantic Drift",
    color: "rgba(201, 163, 106, 0.75)",
    description: "Emotional, nostalgic. Dwelling in feeling.",
  },
  aggressive_momentum: {
    label: "Aggressive Momentum",
    color: "rgba(172, 82, 101, 0.75)",
    description: "Force and forward motion. No brakes.",
  },
  nostalgic_loop: {
    label: "Nostalgic Loop",
    color: "rgba(126, 87, 194, 0.75)",
    description: "Cycling through memory. Seeking the familiar.",
  },
  creative_chaos: {
    label: "Creative Chaos",
    color: "rgba(224, 178, 92, 0.65)",
    description: "Wide aperture. Exploring without a map.",
  },
};

export const SONIC_ARCHETYPE_META: Record<SonicArchetype, { label: string; description: string; glyph: string }> = {
  the_night_builder: {
    label: "The Night Builder",
    description: "High focus, consistent rituals. You build things in silence.",
    glyph: "◈",
  },
  the_restless_romantic: {
    label: "The Restless Romantic",
    description: "Emotion-driven, nostalgic with bursts of intensity.",
    glyph: "◇",
  },
  the_war_mode_strategist: {
    label: "The War Mode Strategist",
    description: "Relentless intensity, tight playlist loops. Attack mode.",
    glyph: "△",
  },
  the_soft_escapist: {
    label: "The Soft Escapist",
    description: "Retreating into sound. Quiet worlds as a refuge.",
    glyph: "○",
  },
  the_chaos_alchemist: {
    label: "The Chaos Alchemist",
    description: "Wide genre range, high energy. Order from disorder.",
    glyph: "✦",
  },
  the_melancholy_operator: {
    label: "The Melancholy Operator",
    description: "Slow, inward, emotionally loaded. Processing at depth.",
    glyph: "◉",
  },
  the_ritual_listener: {
    label: "The Ritual Listener",
    description: "Same sounds, same sequences. Music as ceremony.",
    glyph: "⊕",
  },
};

export const USER_MEANING_META: Record<UserMeaning, { label: string; color: string }> = {
  focus:    { label: "Focus",     color: "rgba(109, 123, 255, 0.7)" },
  pain:     { label: "Pain",      color: "rgba(172, 82, 101, 0.7)"  },
  power:    { label: "Power",     color: "rgba(224, 178, 92, 0.8)"  },
  love:     { label: "Love",      color: "rgba(201, 163, 106, 0.75)"},
  nostalgia:{ label: "Nostalgia", color: "rgba(126, 87, 194, 0.7)"  },
  escape:   { label: "Escape",    color: "rgba(113, 179, 139, 0.7)" },
  recovery: { label: "Recovery",  color: "rgba(113, 179, 139, 0.6)" },
  chaos:    { label: "Chaos",     color: "rgba(172, 82, 101, 0.55)" },
};

export const MUSIC_LIFE_AREAS = [
  { key: "energy",        label: "Energy",        scoreKey: "intensity_score" as const },
  { key: "emotions",      label: "Emotions",      scoreKey: "nostalgia_score" as const },
  { key: "creativity",    label: "Creativity",    scoreKey: "exploration_score" as const },
  { key: "discipline",    label: "Discipline",    scoreKey: "focus_score" as const },
  { key: "recovery",      label: "Recovery",      scoreKey: "focus_score" as const },
];
