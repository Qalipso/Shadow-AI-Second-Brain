import type { SpotifyArtist } from "@/types/music";
import { Card } from "@/components/Card";

function overlap(a: SpotifyArtist[], b: SpotifyArtist[]): number {
  const bIds = new Set(b.map((x) => x.id));
  return a.filter((x) => bIds.has(x.id)).length;
}

export function ListeningShift({
  short,
  medium,
  long,
}: {
  short: SpotifyArtist[];
  medium: SpotifyArtist[];
  long: SpotifyArtist[];
}) {
  const shortMediumOverlap = medium.length ? Math.round((overlap(short, medium) / Math.min(short.length, 10)) * 100) : 0;
  const mediumLongOverlap = long.length ? Math.round((overlap(medium, long) / Math.min(medium.length, 10)) * 100) : 0;

  const shifting = shortMediumOverlap < 40;
  const stable = shortMediumOverlap > 65 && mediumLongOverlap > 65;

  const stateLabel = stable ? "Stable cycle" : shifting ? "Shifting" : "Gradual drift";
  const stateColor = stable
    ? "rgba(113,179,139,0.75)"
    : shifting
    ? "rgba(224,178,92,0.8)"
    : "rgba(126,87,194,0.75)";

  const tiers = [
    { label: "4 weeks",   artists: short.slice(0, 3),  key: "short"  },
    { label: "6 months",  artists: medium.slice(0, 3), key: "medium" },
    { label: "All time",  artists: long.slice(0, 3),   key: "long"   },
  ];

  return (
    <Card title="Listening Shift">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: stateColor, boxShadow: `0 0 6px ${stateColor}` }}
        />
        <span className="text-[11px]" style={{ color: stateColor }}>
          {stateLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiers.map((tier) => (
          <div key={tier.key}>
            <p
              className="text-[9px] font-mono uppercase tracking-widest mb-2"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              {tier.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {tier.artists.map((a) => {
                const img = a.images?.[0]?.url;
                return (
                  <div key={a.id} className="flex items-center gap-1.5">
                    {img ? (
                      <img
                        src={img}
                        alt={a.name}
                        width={20}
                        height={20}
                        className="rounded-full flex-shrink-0 object-cover opacity-80"
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(126,87,194,0.2)" }}
                      />
                    )}
                    <span
                      className="text-[11px] truncate"
                      style={{ color: "var(--shadow-text-muted)" }}
                    >
                      {a.name}
                    </span>
                  </div>
                );
              })}
              {tier.artists.length === 0 && (
                <span className="text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
                  —
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
