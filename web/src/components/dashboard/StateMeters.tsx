"use client";

import { useCallback, useEffect, useState } from "react";

type StateToday = {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  cognitive_load: number;
  answered_count: number;
};

const EMPTY: StateToday = {
  mood: null,
  energy: null,
  stress: null,
  cognitive_load: 0,
  answered_count: 0,
};

function hasAnyData(s: StateToday): boolean {
  return s.mood !== null || s.energy !== null || s.stress !== null || s.answered_count > 0;
}

export function StateMeters() {
  const [state, setState] = useState<StateToday>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state-today", { cache: "no-store" });
      if (!res.ok) {
        setState(EMPTY);
        return;
      }
      const data = (await res.json()) as StateToday;
      setState(data);
    } catch {
      setState(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("shadow:answers:changed", onChange);
    window.addEventListener("shadow:entries:changed", onChange);
    return () => {
      window.removeEventListener("shadow:answers:changed", onChange);
      window.removeEventListener("shadow:entries:changed", onChange);
    };
  }, [refresh]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md skeleton" />
        ))}
      </div>
    );
  }

  if (!hasAnyData(state)) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-6 px-4 text-center">
        <p className="text-sm text-zinc-400">Not enough data yet.</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Answer check-in or add 2-3 signals to estimate your state.
        </p>
      </div>
    );
  }

  // Count how many signals contributed
  const signalCount =
    (state.mood !== null ? 1 : 0) +
    (state.energy !== null ? 1 : 0) +
    (state.stress !== null ? 1 : 0) +
    (state.answered_count > 0 ? state.answered_count : 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <Meter label="Mood" value={state.mood} tone="warm" />
        <Meter label="Energy" value={state.energy} tone="cool" />
        <Meter label="Stress" value={state.stress} tone="danger" />
        <CognitiveLoad value={state.cognitive_load} />
      </div>
      {signalCount > 0 && (
        <p className="text-[10px] text-zinc-600 text-right">
          Based on {signalCount} recent signal{signalCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  warm: "var(--accent-warm)",
  cool: "var(--accent-cool)",
  danger: "var(--state-danger)",
};

function Meter({
  label,
  tone = "warm",
  value,
  max = 10,
}: {
  label: string;
  tone?: "warm" | "cool" | "danger";
  value: number | null;
  max?: number;
}) {
  const pct =
    value === null
      ? 0
      : Math.max(0, Math.min(100, (value / max) * 100));
  const color = TONE[tone];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-400">{label}</span>
        <span
          className="text-[11px] text-zinc-500"
          role="meter"
          aria-label={label}
          aria-valuenow={value ?? 0}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {value === null ? "—" : value}
          <span className="text-zinc-700"> / {max}</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function cognitiveLoadLabel(value: number): { label: string; hint: string } {
  if (value <= 1) return { label: "Low", hint: "" };
  if (value <= 3) return { label: "Medium", hint: "" };
  if (value <= 5) return { label: "High", hint: "Reduce decisions. Pick one task only." };
  return { label: "Overloaded", hint: "Reduce decisions. Pick one task only." };
}

function CognitiveLoad({ value }: { value: number }) {
  const { label, hint } = cognitiveLoadLabel(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-400">Cognitive load</span>
        <span className="font-[family-name:var(--font-fraunces)] text-lg text-zinc-300 leading-none">
          {label}
        </span>
      </div>
      <p className="text-[11px] text-zinc-600">
        {hint || `${value} open high-priority item${value === 1 ? "" : "s"} today.`}
      </p>
    </div>
  );
}
