"use client";

import { useState } from "react";
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
          const isOpen = expandedId === (r.id ?? r.report_date);
          const color = confidenceColor(r.confidence);
          return (
            <button
              type="button"
              key={r.id ?? r.report_date}
              onClick={() =>
                setExpandedId(isOpen ? null : (r.id ?? r.report_date))
              }
              className="card-hover w-full text-left rounded-xl border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3"
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
                <span
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    color,
                    backgroundColor: `${color}14`,
                    border: `1px solid ${color}33`,
                  }}
                >
                  {confidenceLabel(r.confidence)}
                </span>
              </div>

              {isOpen && (
                <div className="mt-3 text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed border-t border-[var(--border)] pt-3">
                  {r.body}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
