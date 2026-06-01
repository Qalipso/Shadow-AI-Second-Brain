import type { SonicProfile, SonicMetrics } from "@/lib/music/profile";
import { SONIC_ARCHETYPE_META, SOUND_STATE_META } from "@/types/music";
import { Card } from "@/components/Card";

const METRIC_META: Array<{ key: keyof SonicMetrics; label: string; color: string }> = [
  { key: "intensity",   label: "Intensity",   color: "rgba(172,82,101,0.85)" },
  { key: "exploration", label: "Exploration", color: "rgba(224,178,92,0.85)" },
  { key: "repeat",      label: "Repeat",      color: "rgba(126,87,194,0.85)" },
  { key: "nostalgia",   label: "Nostalgia",   color: "rgba(109,123,255,0.85)" },
  { key: "focus",       label: "Focus",       color: "rgba(113,179,139,0.85)" },
];

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[10px] font-mono uppercase tracking-[0.15em] w-[88px] flex-shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-[6px] rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }}
        />
      </div>
      <span
        className="text-[10px] font-mono w-7 text-right flex-shrink-0"
        style={{ color: "var(--shadow-text-muted)" }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

export function SonicPortal({ profile }: { profile: SonicProfile }) {
  const arch = SONIC_ARCHETYPE_META[profile.archetype];
  const state = SOUND_STATE_META[profile.soundState];
  const inferred = profile.confidence === "inferred";

  return (
    <Card variant="bloom">
      <p
        className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Current Sonic State
      </p>

      <div className="flex items-start gap-4 mb-5">
        <span
          className="text-[34px] leading-none flex-shrink-0 mt-1"
          style={{ color: "var(--shadow-gold)", textShadow: "0 0 20px rgba(214,184,116,0.35)" }}
        >
          {arch.glyph}
        </span>
        <div className="min-w-0">
          <h2
            className="text-[22px] font-[family-name:var(--font-fraunces)] font-light leading-tight mb-1"
            style={{ color: "var(--shadow-text)" }}
          >
            {arch.label}
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
            {inferred ? "Your listening looks like " : ""}
            {arch.description}
          </p>
        </div>
      </div>

      {/* Poetic sound-state line */}
      <div
        className="rounded-lg px-4 py-3 mb-5"
        style={{ background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${state.color}` }}
      >
        <p
          className="text-[11px] font-mono uppercase tracking-[0.2em] mb-1"
          style={{ color: state.color }}
        >
          {state.label}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
          {state.description}
        </p>
      </div>

      {/* Metric bars */}
      <div className="space-y-2.5 mb-4">
        {METRIC_META.map((m) => (
          <MetricBar key={m.key} label={m.label} value={profile.metrics[m.key]} color={m.color} />
        ))}
      </div>

      {/* Tone disclaimer — hypothesis vs confirmed */}
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--shadow-text-faint)" }}>
        {inferred
          ? "A mirror, not a verdict — inferred from listening patterns alone. Confirm what your music means below to sharpen it."
          : "Shaped by the meanings you confirmed. Still a reflection, not a diagnosis."}
      </p>
    </Card>
  );
}
