import { describe, it, expect } from "vitest";
import { buildSonicProfile } from "@/lib/music/profile";
import { dominantVibe, vibeVectorForGenres } from "@/lib/music/vibe";
import { assignZones } from "@/lib/music/zones";
import { roleForGenres } from "@/lib/music/roles";
import type { SpotifyArtistItem } from "@/types/spotify";

// Minimal artist-item factory mirroring observed live data (Edo T3 profile).
function artist(rank: number, name: string, genres: string[]): SpotifyArtistItem {
  return {
    id: `00000000-0000-0000-0000-${String(rank).padStart(12, "0")}`,
    user_id: "00000000-0000-0000-0000-000000000000",
    spotify_artist_id: `sp_${rank}`,
    name,
    genres,
    popularity: 80,
    image_url: null,
    spotify_url: null,
    period: "short_term",
    rank,
    fetched_at: new Date().toISOString(),
  };
}

const EDO_ARTISTS: SpotifyArtistItem[] = [
  artist(1, "Kanye West", ["rap"]),
  artist(2, "Playboi Carti", ["rage rap"]),
  artist(3, "Oney1", ["boom bap"]),
  artist(4, "Lil Uzi Vert", ["melodic rap", "rage rap"]),
  artist(5, "A$AP Rocky", ["rap"]),
  artist(6, "Yung Lean", ["cloud rap"]),
  artist(7, "XXXTENTACION", ["emo rap"]),
  artist(8, "Destroy Lonely", ["rage rap"]),
];

describe("vibe mapping", () => {
  it("maps rage rap to rage", () => {
    expect(dominantVibe(vibeVectorForGenres(["rage rap"]))).toBe("rage");
  });
  it("maps cloud/emo rap to melancholy", () => {
    expect(dominantVibe(vibeVectorForGenres(["cloud rap"]))).toBe("melancholy");
    expect(dominantVibe(vibeVectorForGenres(["emo rap"]))).toBe("melancholy");
  });
  it("maps boom bap to street", () => {
    expect(dominantVibe(vibeVectorForGenres(["boom bap"]))).toBe("street");
  });
  it("returns null for unknown genres", () => {
    expect(dominantVibe(vibeVectorForGenres(["polka"]))).toBeNull();
  });
});

describe("zones", () => {
  it("clusters Edo artists into multiple lands", () => {
    const zones = assignZones(
      EDO_ARTISTS.map((a) => ({
        id: a.spotify_artist_id,
        name: a.name,
        genres: a.genres,
        imageUrl: null,
        rank: a.rank,
      })),
    );
    const keys = zones.map((z) => z.key);
    expect(keys).toContain("neon_temple"); // rage rap
    expect(keys).toContain("shadow_cave"); // cloud/emo
    expect(keys).toContain("street_portal"); // boom bap
    // every zone has at least one artist, sorted by rank
    for (const z of zones) {
      expect(z.artists.length).toBeGreaterThan(0);
      const ranks = z.artists.map((a) => a.rank);
      expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
    }
  });
});

describe("roles", () => {
  it("assigns chaos_vampire to rage and wounded_beast to melancholy", () => {
    expect(roleForGenres(["rage rap"])).toBe("chaos_vampire");
    expect(roleForGenres(["emo rap"])).toBe("wounded_beast");
  });
});

describe("buildSonicProfile", () => {
  it("produces a complete inferred profile from artists alone", () => {
    const p = buildSonicProfile({ shortArtists: EDO_ARTISTS });
    expect(p.confidence).toBe("inferred");
    expect(p.hasEnoughData).toBe(true);
    expect(p.party.length).toBe(6);
    expect(p.zones.length).toBeGreaterThanOrEqual(3);
    expect(p.archetype).toBeTruthy();
    expect(p.soundState).toBeTruthy();
    expect(p.metrics.intensity).toBeGreaterThan(50); // rage-heavy taste
  });

  it("flips confidence to confirmed when labels exist", () => {
    const p = buildSonicProfile({
      shortArtists: EDO_ARTISTS,
      labels: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          user_id: "00000000-0000-0000-0000-000000000000",
          item_type: "artist",
          item_id: "sp_2",
          item_name: "Playboi Carti",
          artist_name: null,
          label: "Chaos",
          user_note: null,
          confirmed_at: new Date().toISOString(),
        },
      ],
    });
    expect(p.confidence).toBe("confirmed");
    expect(p.confirmedLabels["sp_2"]).toContain("Chaos");
    expect(p.party.find((m) => m.id === "sp_2")?.labels).toContain("Chaos");
  });

  it("flags insufficient data below the artist floor", () => {
    const p = buildSonicProfile({ shortArtists: EDO_ARTISTS.slice(0, 2) });
    expect(p.hasEnoughData).toBe(false);
  });
});
