"use client";

import { useState, useCallback } from "react";

type Rating = "useful" | "not_useful" | null;

export function InsightFeedback({ reportId }: { reportId: string }) {
  const [rating, setRating] = useState<Rating>(null);
  const [saving, setSaving] = useState(false);

  const submit = useCallback(
    async (r: "useful" | "not_useful") => {
      if (saving) return;
      setSaving(true);
      setRating(r);
      try {
        await fetch("/api/insights/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report_id: reportId, rating: r }),
        });
      } finally {
        setSaving(false);
      }
    },
    [reportId, saving],
  );

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
      <span className="text-[10px] text-zinc-600 mr-1">Was this useful?</span>
      <button
        type="button"
        onClick={() => submit("useful")}
        disabled={saving}
        className="text-[10px] px-2 py-0.5 rounded transition-colors"
        style={{
          background: rating === "useful" ? "rgba(111,191,138,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${rating === "useful" ? "#6FBF8A55" : "rgba(255,255,255,0.08)"}`,
          color: rating === "useful" ? "#6FBF8A" : "#71717a",
        }}
      >
        Useful
      </button>
      <button
        type="button"
        onClick={() => submit("not_useful")}
        disabled={saving}
        className="text-[10px] px-2 py-0.5 rounded transition-colors"
        style={{
          background: rating === "not_useful" ? "rgba(224,178,92,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${rating === "not_useful" ? "#E0B25C55" : "rgba(255,255,255,0.08)"}`,
          color: rating === "not_useful" ? "#E0B25C" : "#71717a",
        }}
      >
        Not useful
      </button>
      {rating && (
        <span className="text-[10px] text-zinc-600 ml-1">Saved.</span>
      )}
    </div>
  );
}
