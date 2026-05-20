"use client";

import Link from "next/link";
import { CheckCircle2, Clock, ArrowUpRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

type TestCardProps = {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  estimatedMinutes: number;
  completed: boolean;
  lastCompletedAt?: string | null;
};

const CATEGORY_ACCENT_HEX: Record<string, string> = {
  personality: "#6D7BFF",
  values: "#C9A36A",
  state: "#6FBF8A",
};

const CATEGORY_LABELS: Record<string, string> = {
  personality: "Personality",
  values: "Values",
  state: "Current State",
};

export function TestCard({
  slug,
  title,
  description,
  category,
  estimatedMinutes,
  completed,
  lastCompletedAt,
}: TestCardProps) {
  const hex = CATEGORY_ACCENT_HEX[category ?? ""] ?? "#6D7BFF";
  const categoryLabel = CATEGORY_LABELS[category ?? ""] ?? category ?? "";

  const lastDate = lastCompletedAt
    ? new Date(lastCompletedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <Link
      href={`/labs/${slug}`}
      className={cn(
        "group relative rounded-xl border overflow-hidden block transition-all duration-300",
        "hover:-translate-y-1",
      )}
      style={{
        background: "linear-gradient(160deg, rgba(18,18,26,0.92) 0%, rgba(12,12,18,0.95) 100%)",
        borderColor: completed ? `${hex}35` : "rgba(255,255,255,0.08)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top color stripe — thicker, brighter on hover */}
      <div
        className="h-0.5 w-full transition-all duration-300"
        style={{ background: `linear-gradient(90deg, ${hex}90, ${hex}20 60%, transparent)` }}
      />

      {/* Ambient category bloom */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${hex}18 0%, transparent 70%)` }}
      />

      <div className="p-5">
        {/* Category row */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border"
            style={{
              color: hex,
              borderColor: `${hex}30`,
              background: `${hex}0c`,
            }}
          >
            {categoryLabel}
          </span>

          {completed && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "#6FBF8A" }}>
              <CheckCircle2 size={10} /> Done
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-zinc-100 leading-tight mb-2 group-hover:text-white transition-colors">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 mb-4">{description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {estimatedMinutes} min
            </span>
            {lastDate && (
              <span className="flex items-center gap-1">
                <RefreshCw size={9} /> {lastDate}
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1 text-[11px] font-medium transition-all duration-150 group-hover:gap-1.5"
            style={{ color: hex }}
          >
            {completed ? "Retake" : "Begin"}
            <ArrowUpRight size={11} />
          </div>
        </div>
      </div>

      {/* Hover glow overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        style={{ boxShadow: `inset 0 0 40px ${hex}1a, 0 8px 32px ${hex}15` }}
      />
    </Link>
  );
}
