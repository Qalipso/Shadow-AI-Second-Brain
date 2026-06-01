import type { Zone } from "@/lib/music/zones";
import { Card } from "@/components/Card";

function ZoneCard({ zone }: { zone: Zone }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${zone.color.replace(/[\d.]+\)$/, "0.2)")}` }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[18px] leading-none" style={{ color: zone.color }}>
          {zone.glyph}
        </span>
        <div className="min-w-0">
          <p
            className="text-[13px] font-[family-name:var(--font-fraunces)] font-light leading-tight"
            style={{ color: "var(--shadow-text)" }}
          >
            {zone.label}
          </p>
          <p className="text-[10px] leading-tight" style={{ color: "var(--shadow-text-faint)" }}>
            {zone.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {zone.artists.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            {a.imageUrl ? (
              <img
                src={a.imageUrl}
                alt={a.name}
                width={20}
                height={20}
                className="rounded-full object-cover"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              />
            ) : (
              <span
                className="w-5 h-5 rounded-full"
                style={{ background: zone.color.replace(/[\d.]+\)$/, "0.25)") }}
              />
            )}
            <span className="text-[11px]" style={{ color: "var(--shadow-text-muted)" }}>
              {a.name}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SonicMap({ zones }: { zones: Zone[] }) {
  if (zones.length === 0) return null;
  return (
    <Card title="The Sonic Map">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        Your artists grouped by the territory they pull you into — not by rank.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map((z) => (
          <ZoneCard key={z.key} zone={z} />
        ))}
      </div>
    </Card>
  );
}
