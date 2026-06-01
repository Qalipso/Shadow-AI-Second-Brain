"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type LocalSettings,
} from "@/lib/check-in";

export function CheckInPrefs() {
  const [mounted, setMounted] = useState(false);
  const [s, setS] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setS(loadSettings());
  }, []);

  function persistToServer(next: LocalSettings) {
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questions_per_day: next.questionsPerDay,
          show_questions_on_first_open: next.showQuestionsOnFirstOpen,
        }),
      }).catch(() => { /* non-critical, localStorage already updated */ });
    }, 800);
  }

  function update(patch: Partial<LocalSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    persistToServer(next);
  }

  if (!mounted) return <div className="h-24 skeleton rounded-lg" />;

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3 cursor-pointer">
        <span>
          <p className="text-sm text-zinc-200">
            Show daily questions on first open
          </p>
          <p className="text-[11px] text-zinc-500">
            Opens the 5-question check-in once per local day.
          </p>
        </span>
        <input
          type="checkbox"
          checked={s.showQuestionsOnFirstOpen}
          onChange={(e) =>
            update({ showQuestionsOnFirstOpen: e.target.checked })
          }
          className="h-4 w-4 accent-[var(--accent-warm)]"
        />
      </label>

      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3">
        <p className="text-sm text-zinc-200">Questions per day</p>
        <p className="text-[11px] text-zinc-500">
          More questions = richer signal, longer ritual.
        </p>
        <div className="mt-2 flex gap-2">
          {[3, 5, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ questionsPerDay: n })}
              className={
                s.questionsPerDay === n
                  ? "rounded-md bg-[var(--accent-warm)] text-black px-3 py-1.5 text-xs font-medium"
                  : "rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-[var(--bg-elev3)]"
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
