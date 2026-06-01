// Sonic Mirror — genre → vibe mapping
// Config-driven: maps Spotify genre strings to a small set of "vibe" energies.
// Vibes feed the zone and role engines. Extend VIBE_RULES without touching logic.

export const VIBES = ["rage", "flex", "street", "melancholy", "focus", "escape"] as const;
export type Vibe = (typeof VIBES)[number];

export type VibeVector = Record<Vibe, number>;

export const ZERO_VIBE: VibeVector = {
  rage: 0,
  flex: 0,
  street: 0,
  melancholy: 0,
  focus: 0,
  escape: 0,
};

export const VIBE_META: Record<Vibe, { label: string; color: string }> = {
  rage:       { label: "Rage",       color: "rgba(172,82,101,0.80)" },
  flex:       { label: "Flex",       color: "rgba(224,178,92,0.80)" },
  street:     { label: "Street",     color: "rgba(126,87,194,0.75)" },
  melancholy: { label: "Melancholy", color: "rgba(109,123,255,0.75)" },
  focus:      { label: "Focus",      color: "rgba(113,179,139,0.75)" },
  escape:     { label: "Escape",     color: "rgba(201,163,106,0.70)" },
};

// Each rule: if a genre string contains any `match` substring, add `vibes` weights.
// Ordered roughly specific → generic so specific tags dominate via accumulation.
interface VibeRule {
  match: string[];
  vibes: Partial<VibeVector>;
}

const VIBE_RULES: readonly VibeRule[] = [
  { match: ["rage"], vibes: { rage: 3, flex: 1 } },
  { match: ["drill", "phonk"], vibes: { rage: 3, street: 1 } },
  { match: ["hardcore", "punk", "metal", "grindcore", "noise", "breakcore", "industrial"], vibes: { rage: 3 } },
  { match: ["emo"], vibes: { melancholy: 3, rage: 1 } },
  { match: ["cloud", "sad", "slowcore", "shoegaze", "dream", "lo-fi", "lo fi"], vibes: { melancholy: 3, escape: 1 } },
  { match: ["boom bap", "old school", "east coast", "west coast", "g-funk", "conscious"], vibes: { street: 3 } },
  { match: ["gangsta", "plugg", "trap"], vibes: { street: 2, flex: 2 } },
  { match: ["hyperpop", "pop rap", "pop"], vibes: { flex: 3 } },
  { match: ["ambient", "instrumental", "classical", "drone", "minimal", "neoclassical", "post-rock", "soundtrack", "cinematic", "study"], vibes: { focus: 3 } },
  { match: ["psychedelic", "vapor", "synth", "new age", "chillwave", "downtempo"], vibes: { escape: 3 } },
  { match: ["jazz", "soul", "r&b", "rnb", "funk"], vibes: { escape: 2, melancholy: 1 } },
  { match: ["melodic"], vibes: { melancholy: 2, flex: 1 } },
];

// Fallback rules apply ONLY when no specific rule matched a genre string.
// Prevents the generic "rap" substring (inside "rage rap", "emo rap", etc.)
// from inflating street/flex on already-classified genres.
const FALLBACK_RULES: readonly VibeRule[] = [
  { match: ["hip-hop", "hip hop", "rap"], vibes: { street: 2 } },
];

function addVibes(acc: VibeVector, add: Partial<VibeVector>): VibeVector {
  const next = { ...acc };
  for (const key of VIBES) {
    const v = add[key];
    if (v) next[key] += v;
  }
  return next;
}

/** Accumulate a vibe vector for a single genre string. */
export function vibeVectorForGenre(genre: string): VibeVector {
  const g = genre.toLowerCase();
  let vec = { ...ZERO_VIBE };
  let matchedSpecific = false;
  for (const rule of VIBE_RULES) {
    if (rule.match.some((m) => g.includes(m))) {
      vec = addVibes(vec, rule.vibes);
      matchedSpecific = true;
    }
  }
  // Only fall back to the generic rap/hip-hop mapping when nothing specific hit.
  if (!matchedSpecific) {
    for (const rule of FALLBACK_RULES) {
      if (rule.match.some((m) => g.includes(m))) {
        vec = addVibes(vec, rule.vibes);
      }
    }
  }
  return vec;
}

/** Accumulate a vibe vector across many genres (e.g. one artist's tags). */
export function vibeVectorForGenres(genres: readonly string[]): VibeVector {
  return genres.reduce<VibeVector>((acc, g) => addVibes(acc, vibeVectorForGenre(g)), { ...ZERO_VIBE });
}

/** Highest-weighted vibe in a vector, or null when the vector is empty. */
export function dominantVibe(vec: VibeVector): Vibe | null {
  let best: Vibe | null = null;
  let bestVal = 0;
  for (const key of VIBES) {
    if (vec[key] > bestVal) {
      bestVal = vec[key];
      best = key;
    }
  }
  return best;
}
