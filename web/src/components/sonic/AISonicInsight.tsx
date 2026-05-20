"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/Card";

export function AISonicInsight({ initialInsight }: { initialInsight: string | null }) {
  const [insight, setInsight] = useState(initialInsight);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const res = await fetch("/api/music/insight", { method: "POST" });
      if (res.ok) {
        const json = await res.json() as { insight?: string };
        if (json.insight) setInsight(json.insight);
      }
    });
  }

  return (
    <Card
      title="AI Sonic Insight"
      action={
        <button
          onClick={generate}
          disabled={pending}
          className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-opacity"
          style={{
            borderColor: "rgba(214,184,116,0.2)",
            color: "rgba(214,184,116,0.6)",
            opacity: pending ? 0.4 : 1,
          }}
        >
          {pending ? "reading…" : "refresh"}
        </button>
      }
    >
      {insight ? (
        <p
          className="text-[13px] leading-relaxed italic"
          style={{ color: "var(--shadow-text-muted)" }}
        >
          &ldquo;{insight}&rdquo;
        </p>
      ) : (
        <div className="flex flex-col items-center py-4 gap-3">
          <p className="text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
            No insight generated yet.
          </p>
          <button
            onClick={generate}
            disabled={pending}
            className="ritual-cta rounded-lg px-4 py-2 text-[12px] border"
            style={{
              background: "rgba(214,184,116,0.08)",
              borderColor: "rgba(214,184,116,0.22)",
              color: "rgba(214,184,116,0.85)",
            }}
          >
            {pending ? "Generating…" : "Generate Sonic Insight"}
          </button>
        </div>
      )}
    </Card>
  );
}
