"use client";

import { useState, useCallback } from "react";
import type { DailyReport } from "@/types/db";

function confidenceLabel(c: number | null): string {
  if (c == null) return "unknown";
  if (c < 0.4) return "low";
  if (c < 0.7) return "moderate";
  return "high";
}

function confidenceColor(c: number | null): string {
  if (c == null) return "#5E5867";
  if (c < 0.4) return "#E0B25C";
  if (c < 0.7) return "#6D7BFF";
  return "#6FBF8A";
}

type Rating = "useful" | "not_useful" | null;

function FeedbackButtons({
  reportId,
  initial,
}: {
  reportId: string;
  initial: Rating;
}) {
  const [rating, setRating] = useState<Rating>(initial);
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
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
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
    </div>
  );
}

export function ReportList({ reports }: { reports: DailyReport[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (reports.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
        Past reports
      </h2>
      <div className="space-y-2 anim-stagger">
        {reports.map((r) => {
          const key = r.id ?? r.report_date;
          const isOpen = expandedId === key;
          const color = confidenceColor(r.confidence);
          return (
            <div
              key={key}
              className="card-hover rounded-xl border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : key)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200 truncate">
                      {r.headline ?? `Report for ${r.report_date}`}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {r.report_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        color,
                        backgroundColor: `${color}14`,
                        border: `1px solid ${color}33`,
                      }}
                    >
                      {confidenceLabel(r.confidence)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 border-t border-[var(--border)] pt-3 space-y-3">
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {r.body}
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    confidence: {((r.confidence ?? 0) * 100).toFixed(0)}%
                  </p>
                  {r.id && (
                    <FeedbackButtons reportId={r.id} initial={null} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
