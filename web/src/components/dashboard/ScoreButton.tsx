"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScoreResult = {
  scored: number;
  skipped: number;
  scores: Array<{
    slug: string;
    score: number;
    confidence: number;
    gate: string;
    rationale: string | null;
  }>;
};

export function ScoreButton({ hasScoresToday }: { hasScoresToday: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setState("loading");
    setMessage(null);

    try {
      const resp = await fetch("/api/score-areas", { method: "POST" });
      const data = await resp.json();

      if (!resp.ok) {
        setState("error");
        setMessage(data.error ?? "Scoring failed.");
        return;
      }

      const result = data as ScoreResult;
      setState("done");
      setMessage(`Scored ${result.scored} area${result.scored === 1 ? "" : "s"}.`);
      router.refresh();

      // Auto-dismiss after 3s
      setTimeout(() => {
        setState("idle");
        setMessage(null);
      }, 3000);
    } catch {
      setState("error");
      setMessage("Network error.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent-warm)]/40 bg-[var(--accent-warm)]/10 px-3 py-1.5 text-[11px] text-[var(--accent-warm)] transition-colors hover:bg-[var(--accent-warm)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === "loading" ? (
          <>
            <span className="h-2 w-2 rounded-full bg-[var(--accent-warm)] orb-pulse" />
            Scoring...
          </>
        ) : hasScoresToday ? (
          "Re-score areas"
        ) : (
          "Update scores"
        )}
      </button>
      {message && (
        <span
          className={`text-[11px] ${state === "error" ? "text-red-400" : "text-zinc-400"}`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
