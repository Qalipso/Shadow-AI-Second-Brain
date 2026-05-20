import type { MusicProfile } from "@/types/music";
import { Card } from "@/components/Card";

const AREAS = [
  { key: "Energy",      get: (p: MusicProfile) => p.intensity_score,   color: "rgba(224,178,92,0.75)"   },
  { key: "Emotions",    get: (p: MusicProfile) => p.nostalgia_score,    color: "rgba(126,87,194,0.75)"   },
  { key: "Creativity",  get: (p: MusicProfile) => p.exploration_score,  color: "rgba(109,123,255,0.75)"  },
  { key: "Discipline",  get: (p: MusicProfile) => p.focus_score,        color: "rgba(113,179,139,0.70)"  },
  { key: "Recovery",    get: (p: MusicProfile) => Math.max(0, 80 - p.intensity_score), color: "rgba(113,179,139,0.55)" },
];

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[11px] w-20 flex-shrink-0 text-right"
        style={{ color: "var(--shadow-text-muted)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
      <span
        className="text-[10px] font-mono w-7 flex-shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {Math.round(pct)}
      </span>
    </div>
  );
}

export function MusicLifeCircle({ profile }: { profile: MusicProfile }) {
  return (
    <Card title="Music × Life Circle">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        How your sound patterns map to life areas.
      </p>
      <div className="flex flex-col gap-3">
        {AREAS.map((a) => (
          <Bar key={a.key} label={a.key} value={a.get(profile)} color={a.color} />
        ))}
      </div>
    </Card>
  );
}
