"use client";

export type StateValues = {
  energy: number;
  mood: number;
  mental_noise: number;
  body_state: number;
  focus: number;
};

type Props = {
  values: StateValues;
  onChange: (next: StateValues) => void;
};

// All metrics use a unified 1..5 scale. Mood gets a word descriptor so the
// slider still feels emotional, but the underlying integer matches DB.
const METRICS: {
  key: keyof StateValues;
  label: string;
  min: number;
  max: number;
  description?: (v: number) => string;
}[] = [
  { key: "energy",       label: "Energy",       min: 1, max: 5 },
  {
    key: "mood",
    label: "Mood",
    min: 1,
    max: 5,
    description: (v: number) => {
      if (v <= 1) return "struggling";
      if (v === 2) return "low";
      if (v === 3) return "neutral";
      if (v === 4) return "good";
      return "amazing";
    },
  },
  { key: "mental_noise", label: "Mental noise", min: 1, max: 5 },
  { key: "body_state",   label: "Body state",   min: 1, max: 5 },
  { key: "focus",        label: "Focus",        min: 1, max: 5 },
];

export function StateSliders({ values, onChange }: Props) {
  function handleChange(key: keyof StateValues, raw: number) {
    onChange({ ...values, [key]: raw });
  }

  return (
    <div className="space-y-5">
      {METRICS.map((m) => {
        const val = values[m.key];
        const desc = m.description ? m.description(val) : null;

        return (
          <div key={m.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-400 uppercase tracking-widest">
                {m.label}
              </span>
              <span className="flex items-center gap-1.5">
                {desc ? (
                  <span className="text-[11px] text-zinc-500">{desc}</span>
                ) : null}
                <span className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--accent-warm)] leading-none tabular-nums w-6 text-right">
                  {val}
                </span>
              </span>
            </div>
            <input
              type="range"
              min={m.min}
              max={m.max}
              step={1}
              value={val}
              onChange={(e) => handleChange(m.key, Number(e.target.value))}
              className="w-full accent-[var(--accent-warm)] cursor-pointer"
              aria-label={m.label}
            />
            {m.key === "mood" ? (
              <div className="flex justify-between mt-0.5 text-[10px] text-zinc-700">
                <span>struggling</span>
                <span>amazing</span>
              </div>
            ) : (
              <div className="flex justify-between mt-0.5 text-[10px] text-zinc-700">
                <span>low</span>
                <span>high</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
