import type { SonicTensions } from "@/lib/music/profile";
import { Card } from "@/components/Card";

const AXES: Array<{ key: keyof SonicTensions; left: string; right: string; color: string }> = [
  { key: "controlChaos",  left: "Control", right: "Chaos",   color: "rgba(172,82,101,0.85)" },
  { key: "stylePain",     left: "Style",   right: "Pain",    color: "rgba(126,87,194,0.85)" },
  { key: "streetDigital", left: "Street",  right: "Digital", color: "rgba(113,179,139,0.85)" },
];

function Axis({ left, right, value, color }: { left: string; right: string; value: number; color: string }) {
  // value in [-1,1] → marker position 0..100%
  const pct = Math.max(4, Math.min(96, ((value + 1) / 2) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em]">
        <span style={{ color: "var(--shadow-text-muted)" }}>{left}</span>
        <span style={{ color: "var(--shadow-text-muted)" }}>{right}</span>
      </div>
      <div className="relative h-[6px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        {/* center tick */}
        <span
          className="absolute top-1/2 -translate-y-1/2 w-px h-[10px]"
          style={{ left: "50%", background: "rgba(255,255,255,0.12)" }}
        />
        {/* marker */}
        <span
          className="absolute top-1/2 w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </div>
  );
}

export function SonicTension({ tensions }: { tensions: SonicTensions }) {
  return (
    <Card title="Taste Tension">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        Where your listening sits between opposing pulls. Center means balanced.
      </p>
      <div className="space-y-4">
        {AXES.map((a) => (
          <Axis key={a.key} left={a.left} right={a.right} value={tensions[a.key]} color={a.color} />
        ))}
      </div>
    </Card>
  );
}
