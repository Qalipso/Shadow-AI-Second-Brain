"use client";

import { useState } from "react";

type DigestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "done";
      headline: string;
      theme: string;
      patterns: string[];
      nudge: string;
      streak: number;
      week_start: string;
      week_end: string;
    };

export function WeeklyDigestCard() {
  const [state, setState] = useState<DigestState>({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/reports/weekly", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Failed to generate digest." });
        return;
      }
      setState({ status: "done", ...data });
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[var(--bg-elev1)] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">Weekly Digest</p>
          <p className="text-sm text-zinc-400 mt-0.5">
            {state.status === "done"
              ? `${state.week_start} → ${state.week_end}`
              : "Your week, summarized by Shadow."}
          </p>
        </div>
        {state.status !== "loading" && (
          <button
            onClick={generate}
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
          >
            {state.status === "done" ? "Regenerate" : "Generate"}
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-zinc-800" />
          <div className="h-3 w-1/2 rounded bg-zinc-800" />
          <div className="h-3 w-2/3 rounded bg-zinc-800" />
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}

      {state.status === "done" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span
              className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest"
              style={{
                background: "rgba(124,92,255,0.12)",
                border: "1px solid rgba(124,92,255,0.2)",
                color: "rgb(167,139,250)",
              }}
            >
              {state.theme}
            </span>
          </div>

          <p className="text-base font-medium text-zinc-100 leading-snug">
            {state.headline}
          </p>

          {state.patterns.length > 0 && (
            <ul className="space-y-1.5">
              {state.patterns.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-zinc-600 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          )}

          {state.nudge && (
            <div
              className="rounded-lg p-3 text-sm text-zinc-300"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-zinc-600 text-xs uppercase tracking-wider mr-2">Next week:</span>
              {state.nudge}
            </div>
          )}

          {state.streak >= 2 && (
            <p className="text-xs text-zinc-600">
              {state.streak}-day check-in streak — keep it going.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
