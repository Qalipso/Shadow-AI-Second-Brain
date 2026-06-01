// Sonic Mirror — role engine
// Assigns each artist a "party member" role from its dominant vibe.
// Falls back to a neutral role when no vibe is detectable.

import type { Vibe } from "@/lib/music/vibe";
import { dominantVibe, vibeVectorForGenres } from "@/lib/music/vibe";

export const ROLE_KEYS = [
  "chaos_vampire",
  "style_prophet",
  "street_oracle",
  "wounded_beast",
  "architect",
  "void_runner",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_META: Record<RoleKey, { label: string; unlock: string; glyph: string }> = {
  chaos_vampire: { label: "Chaos Vampire", unlock: "Unlocks raw adrenaline and override mode.", glyph: "▲" },
  style_prophet: { label: "Style Prophet", unlock: "Unlocks confidence and self-presentation.", glyph: "◆" },
  street_oracle: { label: "Street Oracle", unlock: "Unlocks grounding, rhythm, and narrative.", glyph: "⊞" },
  wounded_beast: { label: "Wounded Beast", unlock: "Unlocks emotional release and confession.", glyph: "◉" },
  architect:     { label: "The Architect", unlock: "Unlocks deep focus and building mode.",     glyph: "◈" },
  void_runner:   { label: "Void Runner",   unlock: "Unlocks escape, drift, and reset.",         glyph: "○" },
};

const VIBE_TO_ROLE: Record<Vibe, RoleKey> = {
  rage: "chaos_vampire",
  flex: "style_prophet",
  street: "street_oracle",
  melancholy: "wounded_beast",
  focus: "architect",
  escape: "void_runner",
};

const FALLBACK_ROLE: RoleKey = "void_runner";

/** Role for a single artist, derived from its genres. */
export function roleForGenres(genres: readonly string[]): RoleKey {
  const vibe = dominantVibe(vibeVectorForGenres(genres));
  return vibe ? VIBE_TO_ROLE[vibe] : FALLBACK_ROLE;
}

/** Role directly from an already-computed dominant vibe (or fallback when null). */
export function roleForVibe(vibe: Vibe | null): RoleKey {
  return vibe ? VIBE_TO_ROLE[vibe] : FALLBACK_ROLE;
}
