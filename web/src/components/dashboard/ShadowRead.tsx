"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useEntries } from "@/lib/entries/useEntries";
import { lifeAreaName } from "@/lib/life-areas/meta";
import { BookOpen, Zap, AlertTriangle, ArrowRight } from "lucide-react";

type StateToday = {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  cognitive_load: number;
  answered_count: number;
};

type ReadField = {
  label: string;
  value: string;
  icon: typeof BookOpen;
};

function deriveMainTheme(
  entries: ReturnType<typeof useEntries>["entries"],
): string {
  if (entries.length === 0) return "";

  const areaCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.lifeAreaSlug) continue;
    areaCounts.set(e.lifeAreaSlug, (areaCounts.get(e.lifeAreaSlug) ?? 0) + 1);
  }

  if (areaCounts.size === 0) {
    const types = new Map<string, number>();
    for (const e of entries) {
      const t = e.entryType ?? "raw";
      types.set(t, (types.get(t) ?? 0) + 1);
    }
    const sorted = [...types.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      return `Mostly ${sorted[0][0]} signals`;
    }
    return "Mixed signals";
  }

  const sorted = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top = lifeAreaName(sorted[0][0]) ?? sorted[0][0];

  if (sorted.length >= 2 && sorted[1][1] >= 2) {
    const second = lifeAreaName(sorted[1][0]) ?? sorted[1][0];
    return `${top} + ${second}`;
  }

  return top;
}

function deriveEmotionalState(
  entries: ReturnType<typeof useEntries>["entries"],
  state: StateToday | null,
): string {
  // Use mood/energy/stress if available
  if (state && state.mood !== null && state.energy !== null) {
    const parts: string[] = [];
    if (state.mood !== null) {
      parts.push(state.mood >= 7 ? "Good mood" : state.mood >= 4 ? "Neutral mood" : "Low mood");
    }
    if (state.energy !== null) {
      parts.push(state.energy >= 7 ? "high energy" : state.energy >= 4 ? "moderate energy" : "low energy");
    }
    return parts.join(", ");
  }

  // Fall back to emotion tags from entries
  const emotions = entries
    .map((e) => e.emotionPrimary)
    .filter((e): e is string => e != null);

  if (emotions.length === 0) return "Not enough emotional signal yet";

  const counts = new Map<string, number>();
  for (const em of emotions) {
    counts.set(em, (counts.get(em) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0][0];

  if (sorted.length >= 2) {
    return `${top}, with some ${sorted[1][0]}`;
  }
  return top;
}

function deriveRisk(
  entries: ReturnType<typeof useEntries>["entries"],
  state: StateToday | null,
): string {
  // High stress + low energy = burnout risk
  if (state?.stress !== null && state?.energy !== null) {
    if ((state?.stress ?? 0) >= 7 && (state?.energy ?? 10) <= 4) {
      return "Burnout pattern — high stress, low energy";
    }
    if ((state?.stress ?? 0) >= 7) {
      return "Elevated stress";
    }
  }

  // Cognitive overload
  if (state && state.cognitive_load >= 5) {
    return "Cognitive overload — too many open items";
  }

  // No entries = avoidance risk
  if (entries.length === 0) {
    return "No signal — possible avoidance or disengagement";
  }

  // Lots of negative emotions
  const negCount = entries.filter(
    (e) => e.emotionPrimary && ["sad", "angry", "anxious", "frustrated", "stressed", "overwhelmed", "tired"].includes(e.emotionPrimary.toLowerCase()),
  ).length;

  if (negCount >= 3) {
    return "Accumulating negative signals";
  }

  return "No clear risk detected";
}

function deriveNextMove(
  entries: ReturnType<typeof useEntries>["entries"],
  state: StateToday | null,
): string {
  if (state?.answered_count === 0 && entries.length === 0) {
    return "Start with a check-in or drop one signal into inbox.";
  }

  if ((state?.energy ?? 10) <= 3) {
    return "Rest or do one low-effort task. Protect your energy.";
  }

  if ((state?.stress ?? 0) >= 7) {
    return "Reduce decisions. Pick one task only.";
  }

  if (state && state.cognitive_load >= 5) {
    return "Close or defer 2-3 open items to reduce load.";
  }

  if (entries.length <= 2) {
    return "Add a few more signals so Shadow can build a clearer picture.";
  }

  return "Pick one small visible task and work for 25 minutes.";
}

export function ShadowRead() {
  const { entries, mode } = useEntries(20);
  const [state, setState] = useState<StateToday | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state-today", { cache: "no-store" });
      if (res.ok) {
        setState((await res.json()) as StateToday);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchState();
    const onChange = () => fetchState();
    window.addEventListener("shadow:answers:changed", onChange);
    return () => window.removeEventListener("shadow:answers:changed", onChange);
  }, [fetchState]);

  const hasData = entries.length >= 2 || (state?.answered_count ?? 0) > 0;

  const fields: ReadField[] = useMemo(() => {
    if (!hasData) return [];
    return [
      { label: "Main theme", value: deriveMainTheme(entries), icon: BookOpen },
      { label: "Emotional state", value: deriveEmotionalState(entries, state), icon: Zap },
      { label: "Risk", value: deriveRisk(entries, state), icon: AlertTriangle },
      { label: "Best next move", value: deriveNextMove(entries, state), icon: ArrowRight },
    ];
  }, [entries, state, hasData]);

  if (mode === "loading") {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[rgba(20,20,27,0.8)] backdrop-blur-sm p-5">
        <div className="h-32 rounded-md skeleton" />
      </section>
    );
  }

  function openCheckIn() {
    window.dispatchEvent(new CustomEvent("shadow:check-in:open"));
  }

  function goInbox() {
    window.location.href = "/inbox";
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[rgba(20,20,27,0.8)] backdrop-blur-sm p-5 card-glow">
      <h2 className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 mb-4">
        Today&apos;s Shadow Read
      </h2>

      {!hasData ? (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-400">Not enough signal yet.</p>
          <p className="text-[11px] text-zinc-600 mt-1 max-w-sm mx-auto">
            Drop 2-3 thoughts, tasks, feelings, events or answer your daily check-in.
            Shadow will use them to estimate your state and suggest the next move.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={openCheckIn}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--accent-warm)]/40 px-3 py-1.5 text-[11px] text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/10"
            >
              Open check-in
            </button>
            <button
              type="button"
              onClick={goInbox}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)]"
            >
              Drop a signal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className="text-zinc-600" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    {f.label}
                  </span>
                </div>
                <p className="text-sm text-zinc-200 leading-snug">{f.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
