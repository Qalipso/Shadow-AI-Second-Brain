// Sonic Mirror — zone engine
// Clusters artists into symbolic "lands" by their dominant vibe.
// A zone is a thematic grouping, NOT a ranking.

import type { Vibe, VibeVector } from "@/lib/music/vibe";
import { dominantVibe, vibeVectorForGenres } from "@/lib/music/vibe";

export const ZONE_KEYS = [
  "neon_temple",
  "shadow_cave",
  "street_portal",
  "ego_palace",
  "the_void",
] as const;
export type ZoneKey = (typeof ZONE_KEYS)[number];

export const ZONE_META: Record<ZoneKey, { label: string; subtitle: string; glyph: string; color: string }> = {
  neon_temple:   { label: "The Neon Temple",  subtitle: "High-voltage rage and adrenaline.",   glyph: "▲", color: "rgba(172,82,101,0.80)" },
  ego_palace:    { label: "The Ego Palace",    subtitle: "Flex, status, and self-mythology.",   glyph: "◆", color: "rgba(224,178,92,0.80)" },
  street_portal: { label: "The Street Portal", subtitle: "Roots, rhythm, and raw narrative.",    glyph: "⊞", color: "rgba(126,87,194,0.75)" },
  shadow_cave:   { label: "The Shadow Cave",   subtitle: "Melancholy, confession, and depth.",   glyph: "◉", color: "rgba(109,123,255,0.75)" },
  the_void:      { label: "The Void",          subtitle: "Focus, ambient escape, quiet worlds.", glyph: "○", color: "rgba(113,179,139,0.75)" },
};

// Which zone a dominant vibe belongs to.
const VIBE_TO_ZONE: Record<Vibe, ZoneKey> = {
  rage: "neon_temple",
  flex: "ego_palace",
  street: "street_portal",
  melancholy: "shadow_cave",
  focus: "the_void",
  escape: "the_void",
};

export interface ZoneArtistInput {
  id: string;
  name: string;
  genres: readonly string[];
  imageUrl: string | null;
  rank: number;
}

export interface ZoneArtist extends ZoneArtistInput {
  vibe: Vibe | null;
  vibeVector: VibeVector;
}

export interface Zone {
  key: ZoneKey;
  label: string;
  subtitle: string;
  glyph: string;
  color: string;
  artists: ZoneArtist[];
}

/** Assign each artist its dominant vibe + zone, then group into populated zones. */
export function assignZones(artists: readonly ZoneArtistInput[]): Zone[] {
  const enriched: Array<ZoneArtist & { zone: ZoneKey }> = artists.map((a) => {
    const vibeVector = vibeVectorForGenres(a.genres);
    const vibe = dominantVibe(vibeVector);
    // Unknown vibe (no genre match) falls back to the Void — quiet/unclassified.
    const zone = vibe ? VIBE_TO_ZONE[vibe] : "the_void";
    return { ...a, vibeVector, vibe, zone };
  });

  // Preserve canonical zone order; only emit zones that have artists.
  return ZONE_KEYS.flatMap((key) => {
    const members = enriched
      .filter((a) => a.zone === key)
      .sort((x, y) => x.rank - y.rank)
      .map(({ zone: _zone, ...rest }) => rest);
    if (members.length === 0) return [];
    const meta = ZONE_META[key];
    return [{ key, ...meta, artists: members }];
  });
}
