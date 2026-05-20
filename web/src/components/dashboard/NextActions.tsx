"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useEntries } from "@/lib/entries/useEntries";
import { lifeAreaName } from "@/lib/life-areas/meta";
import { ArrowRight } from "lucide-react";

type StateToday = {
  mood: number | null;
  energy: number | null;
  stress: number | null;
  cognitive_load: number;
  answered_count: number;
};

type Action = {
  title: string;
  reason: string;
  cta?: { label: string; href: string };
};

function deriveActions(
  entries: ReturnType<typeof useEntries>["entries"],
  state: StateToday | null,
): Action[] {
  const actions: Action[] = [];
  const hasCheckIn = (state?.answered_count ?? 0) > 0;

  // No data at all
  if (entries.length === 0 && !hasCheckIn) {
    return [];
  }

  // Energy is low
  if (state?.energy !== null && (state?.energy ?? 10) <= 3) {
    actions.push({
      title: "Lower intensity today",
      reason: "Your energy signal is low. Protect recovery.",
    });
  }

  // Stress is high
  if (state?.stress !== null && (state?.stress ?? 0) >= 7) {
    actions.push({
      title: "Reduce decisions. Pick one task only.",
      reason: "Stress is elevated. Fewer choices means less cognitive load.",
    });
  }

  // Cognitive overload
  if (state && state.cognitive_load >= 5) {
    actions.push({
      title: "Close or defer 2-3 open items",
      reason: "Cognitive load is high. Simplify your plate.",
    });
  }

  // Raw/unprocessed signals — suggest structuring
  const rawCount = entries.filter((e) => e.status === "unprocessed").length;
  if (rawCount >= 2) {
    actions.push({
      title: "Let Shadow process raw signals",
      reason: `${rawCount} signal${rawCount === 1 ? "" : "s"} still unprocessed. Classification will route them.`,
    });
  }

  // Dominant area — suggest concrete task
  const areaCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.lifeAreaSlug) continue;
    areaCounts.set(e.lifeAreaSlug, (areaCounts.get(e.lifeAreaSlug) ?? 0) + 1);
  }
  if (areaCounts.size > 0) {
    const sorted = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topSlug = sorted[0][0];
    const topName = lifeAreaName(topSlug) ?? topSlug;
    const topCount = sorted[0][1];

    if (topCount >= 2) {
      actions.push({
        title: `Define one concrete ${topName} task`,
        reason: `${topCount} recent signals point to ${topName}. Turn pressure into progress.`,
        cta: { label: "Create task", href: "/tasks" },
      });
    }
  }

  // Negative emotions piling up
  const negEmotions = entries.filter(
    (e) =>
      e.emotionPrimary &&
      ["sad", "angry", "anxious", "frustrated", "stressed", "overwhelmed", "tired", "resistance", "avoidance"].includes(
        e.emotionPrimary.toLowerCase(),
      ),
  );
  if (negEmotions.length >= 2 && !actions.some((a) => a.title.includes("intensity"))) {
    actions.push({
      title: "Acknowledge the resistance",
      reason: "Multiple signals show friction. Naming it reduces its power.",
    });
  }

  // No check-in yet
  if (!hasCheckIn && entries.length > 0) {
    actions.push({
      title: "Complete your daily check-in",
      reason: "Shadow needs your state answers to build a full picture.",
    });
  }

  // Generic fallback
  if (actions.length === 0 && entries.length > 0) {
    actions.push({
      title: "Pick one small visible task and work for 25 minutes",
      reason: "Your day has signals but no clear blocker. Momentum is the best move.",
    });
  }

  return actions.slice(0, 3);
}

export function NextActions() {
  const { entries, mode } = useEntries(20);
  const [state, setState] = useState<StateToday | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state-today", { cache: "no-store" });
      if (res.ok) setState((await res.json()) as StateToday);
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

  const actions = useMemo(() => deriveActions(entries, state), [entries, state]);

  if (mode === "loading") {
    return <div className="h-20 rounded-md skeleton" />;
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-6 px-4 text-center">
        <p className="text-sm text-zinc-400">No actions yet.</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Capture a signal or complete check-in to let Shadow suggest the next move.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {actions.map((a, i) => (
        <li
          key={i}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent-warm)]/15 text-[10px] text-[var(--accent-warm)] font-medium mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-200 leading-snug">{a.title}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{a.reason}</p>
              {a.cta && (
                <a
                  href={a.cta.href}
                  className="inline-flex items-center gap-1 mt-2 text-[11px] text-[var(--accent-warm)] hover:underline"
                >
                  {a.cta.label}
                  <ArrowRight size={10} />
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
