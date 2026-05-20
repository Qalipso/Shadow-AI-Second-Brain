"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

const CHIPS = [
  "I feel...",
  "I need to...",
  "Today I noticed...",
  "I avoided...",
  "I spent...",
  "I want to remember...",
] as const;

export function InboxShortcut() {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "extracting" | "done">("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount to avoid setState on unmounted component.
  useEffect(() => () => { if (resetTimerRef.current != null) clearTimeout(resetTimerRef.current); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || state !== "idle") return;

    setState("sending");

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });

      if (!res.ok) {
        setState("idle");
        return;
      }

      setText("");
      setState("extracting");

      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent("shadow:entries:changed"));

      // Trigger classification in background
      const data = (await res.json()) as { entry?: { id: string } };
      if (data.entry?.id) {
        fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entry_id: data.entry.id }),
        })
          .then(() => {
            window.dispatchEvent(new CustomEvent("shadow:entries:changed"));
          })
          .catch(() => {
            // classification failed silently
          });
      }

      // Auto-reset after 2s — store ref for cleanup.
      if (resetTimerRef.current != null) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setState("idle");
        resetTimerRef.current = null;
      }, 2000);
    } catch {
      setState("idle");
    }
  }

  function pickChip(chip: string) {
    setText(chip + " ");
    setState("idle");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Drop a thought, task, feeling, expense, meal, event, fear, or idea."
          aria-label="Quick capture"
          disabled={state === "sending"}
          className="w-full rounded-md bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || state !== "idle"}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent-warm)] text-black px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {state === "sending" ? (
            "Sending..."
          ) : state === "extracting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-black/40 orb-pulse" />
              Extracting signal...
            </>
          ) : (
            <>
              <Send size={14} />
              Capture
            </>
          )}
        </button>
      </form>

      <p className="text-[11px] text-zinc-600">
        Shadow will structure it into signals, tasks, memory or Life Circle areas.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => pickChip(chip)}
            className="rounded-md border border-zinc-800 px-2 py-2 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-[var(--bg-elev2)] transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
