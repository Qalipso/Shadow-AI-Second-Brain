"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, Radio } from "lucide-react";
import { getCompletedAtToday, isCompletedToday } from "@/lib/check-in";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type HeroState = "loading" | "done" | "raw_signals" | "not_started";

export function CheckInHero() {
  const [mounted, setMounted] = useState(false);
  const [heroState, setHeroState] = useState<HeroState>("loading");
  const [doneAt, setDoneAt] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [signalCount, setSignalCount] = useState(0);

  useEffect(() => {
    setMounted(true);

    async function refresh() {
      let answers = 0;
      let signals = 0;

      // Fetch state + signal count in parallel
      try {
        const [stateRes, entriesRes] = await Promise.all([
          fetch("/api/state-today", { cache: "no-store" }),
          fetch("/api/entries?limit=100&today=true", { cache: "no-store" }).catch(() => null),
        ]);

        if (stateRes.ok) {
          const data = (await stateRes.json()) as { answered_count: number };
          answers = data.answered_count;
        }

        if (entriesRes?.ok) {
          const eData = (await entriesRes.json()) as { entries?: unknown[] };
          signals = eData.entries?.length ?? 0;
        }
      } catch {
        // fallback to local
      }

      setAnsweredCount(answers);
      setSignalCount(signals);

      if (answers > 0 || isCompletedToday()) {
        setHeroState("done");
        setDoneAt(getCompletedAtToday());
      } else if (signals > 0) {
        setHeroState("raw_signals");
      } else {
        setHeroState("not_started");
      }
    }

    refresh();
    const onChange = () => refresh();
    window.addEventListener("shadow:answers:changed", onChange);
    window.addEventListener("shadow:entries:changed", onChange);
    return () => {
      window.removeEventListener("shadow:answers:changed", onChange);
      window.removeEventListener("shadow:entries:changed", onChange);
    };
  }, []);

  function openModal() {
    window.dispatchEvent(new CustomEvent("shadow:check-in:open"));
  }

  if (!mounted || heroState === "loading") {
    return <div aria-hidden className="h-16 rounded-xl skeleton" />;
  }

  // State: check-in completed — compact single circle
  if (heroState === "done") {
    return (
      <button
        type="button"
        onClick={openModal}
        title={`Today is structured${doneAt ? ` · completed at ${formatTime(doneAt)}` : ""}`}
        className="anim-fade-in flex items-center gap-2.5 hover:opacity-80 transition-opacity"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--state-success)]/15 text-[var(--state-success)] ring-1 ring-[var(--state-success)]/25">
          <Check size={16} strokeWidth={2.5} />
        </span>
        <span className="text-[11px] text-zinc-500">Today structured</span>
      </button>
    );
  }

  // State: raw signals only (no check-in)
  if (heroState === "raw_signals") {
    return (
      <div className="anim-fade-in flex items-center justify-between rounded-xl border border-[var(--accent-warm)]/20 bg-[var(--bg-elev1)] px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
            <Radio size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-zinc-200">Shadow is reading your day</p>
            <p className="text-[11px] text-zinc-500">
              {signalCount} raw signal{signalCount === 1 ? "" : "s"} captured · state estimate is still forming
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)]"
        >
          Continue
        </button>
      </div>
    );
  }

  // State: nothing yet
  return (
    <button
      type="button"
      onClick={openModal}
      className="anim-fade-up group block w-full text-left rounded-xl border border-[var(--accent-warm)]/30 bg-gradient-to-br from-[var(--bg-elev1)] via-[var(--bg-elev1)] to-[var(--bg-elev2)] px-6 py-5 card-hover"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-zinc-200">Today is not structured yet</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Answer your daily check-in or drop a few signals to let Shadow read the day.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-md bg-[var(--accent-warm)] text-black px-4 py-2 text-sm font-medium group-hover:opacity-90">
          <Sparkles size={14} />
          Start check-in
        </span>
      </div>
    </button>
  );
}
