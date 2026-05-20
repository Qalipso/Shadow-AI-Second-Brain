"use client";

import Link from "next/link";
import { RadarChart } from "./RadarChart";
import type { LabsResult } from "@/types/db";
import { ArrowLeft, RefreshCw, Brain, BookOpen, AlertTriangle, Sparkles } from "lucide-react";

type Interpretation = {
  headline?: string;
  summary?: string;
  dimension_insights?: Array<{
    dimension: string;
    score: number;
    label: string;
    insight: string;
  }>;
  follow_up_questions?: string[];
};

type ShadowPersonalization = {
  tone_style?: string;
  motivation_approach?: string;
  planning_style?: string;
  feedback_style?: string;
  risk_zones?: string[];
};

type BehavioralPatterns = string[];

type MemoryCandidate = {
  title: string;
  content: string;
  importance: number;
  stability: string;
  tags: string[];
};

type ResultsViewProps = {
  result: LabsResult;
  testSlug: string;
  testTitle: string;
  testCategory: string | null;
};

function scoreLabel(score: number): string {
  if (score >= 80) return "Very high";
  if (score >= 65) return "High";
  if (score >= 45) return "Moderate";
  if (score >= 30) return "Low";
  return "Very low";
}

const CATEGORY_ACCENT: Record<string, string> = {
  personality: "var(--accent-cool)",
  values: "var(--accent-warm)",
  state: "#6FBF8A",
};

export function ResultsView({ result, testSlug, testTitle, testCategory }: ResultsViewProps) {
  const accent = CATEGORY_ACCENT[testCategory ?? ""] ?? "var(--accent-cool)";
  const scores = result.scores_json as Record<string, number>;
  const interpretation = result.interpretation_json as {
    interpretation?: Interpretation;
    behavioral_patterns?: BehavioralPatterns;
    shadow_personalization?: ShadowPersonalization;
    memory_candidates?: MemoryCandidate[];
    follow_up_questions?: string[];
  };

  const interp = interpretation?.interpretation;
  const patterns = interpretation?.behavioral_patterns ?? [];
  const personalization = interpretation?.shadow_personalization;
  const followUpQuestions = interpretation?.follow_up_questions ?? interp?.follow_up_questions ?? [];
  const memoryCandidates = (interpretation?.memory_candidates ?? []) as MemoryCandidate[];
  const memoryCapturedCount = memoryCandidates.length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/labs"
        className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Labs
      </Link>

      {/* Header */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-1">
          {testTitle} — Results
        </p>
        {interp?.headline && (
          <h2
            className="text-[26px] font-[family-name:var(--font-fraunces)] leading-snug"
            style={{
              background: `linear-gradient(135deg, var(--text-primary) 0%, ${accent} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {interp.headline}
          </h2>
        )}
        {interp?.summary && (
          <p className="text-[14px] text-zinc-400 leading-relaxed mt-2">{interp.summary}</p>
        )}
      </div>

      <div className="glow-line" />

      {/* Radar Chart */}
      <div
        className="rounded-xl border p-6 flex flex-col items-center overflow-visible"
        style={{ background: "rgba(20,20,27,0.8)", borderColor: "var(--border)" }}
      >
        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-5">Dimension Map</p>
        <RadarChart scores={scores} size={280} accentColor={accent} />
      </div>

      {/* Dimension Insights */}
      {interp?.dimension_insights && interp.dimension_insights.length > 0 && (
        <div className="space-y-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">Dimension Breakdown</p>
          {interp.dimension_insights.map((d) => (
            <div
              key={d.dimension}
              className="rounded-xl border p-4"
              style={{ background: "rgba(20,20,27,0.6)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-mono text-zinc-400 capitalize">
                  {d.dimension.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">{d.label}</span>
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: accent }}
                  >
                    {d.score}
                  </span>
                </div>
              </div>
              {/* Score bar */}
              <div className="h-0.5 rounded-full mb-2" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${d.score}%`, background: accent }}
                />
              </div>
              <p className="text-[12px] text-zinc-400">{d.insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Behavioral Patterns */}
      {patterns.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(20,20,27,0.6)", borderColor: "var(--border)" }}
        >
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">Behavioral Patterns</p>
          <ul className="space-y-2">
            {patterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: accent }} />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up Questions */}
      {followUpQuestions.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(20,20,27,0.6)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={13} style={{ color: accent }} />
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">
              Questions for Further Reflection
            </p>
          </div>
          <ul className="space-y-3">
            {followUpQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="text-[10px] font-mono mt-0.5 flex-shrink-0 w-4 text-right"
                  style={{ color: accent }}
                >
                  {i + 1}.
                </span>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{q}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Memory Captured */}
      {memoryCapturedCount > 0 && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{
            background: `${accent}0a`,
            borderColor: `${accent}20`,
          }}
        >
          <Sparkles size={13} style={{ color: accent }} />
          <p className="text-[11px]" style={{ color: accent }}>
            Shadow saved{" "}
            <span className="font-semibold">{memoryCapturedCount}</span>{" "}
            insight{memoryCapturedCount !== 1 ? "s" : ""} from this test to your memory
          </p>
        </div>
      )}

      {/* Shadow Personalization */}
      {personalization && Object.keys(personalization).length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{
            background: `${accent}08`,
            borderColor: `${accent}25`,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} style={{ color: accent }} />
            <p className="text-[9px] font-mono uppercase tracking-[0.25em]" style={{ color: accent }}>
              How Shadow Will Adapt to You
            </p>
          </div>
          <div className="space-y-3">
            {personalization.tone_style && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Tone</p>
                <p className="text-[12px] text-zinc-300">{personalization.tone_style}</p>
              </div>
            )}
            {personalization.motivation_approach && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Motivation</p>
                <p className="text-[12px] text-zinc-300">{personalization.motivation_approach}</p>
              </div>
            )}
            {personalization.planning_style && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Planning</p>
                <p className="text-[12px] text-zinc-300">{personalization.planning_style}</p>
              </div>
            )}
            {personalization.feedback_style && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Feedback Style</p>
                <p className="text-[12px] text-zinc-300">{personalization.feedback_style}</p>
              </div>
            )}
            {personalization.risk_zones && personalization.risk_zones.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Risk Zones</p>
                <div className="flex flex-wrap gap-2">
                  {personalization.risk_zones.map((rz, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{
                        background: "rgba(227,97,97,0.1)",
                        color: "var(--state-danger)",
                        border: "1px solid rgba(227,97,97,0.2)",
                      }}
                    >
                      {rz}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Link
          href={`/labs/${testSlug}`}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] border transition-all text-zinc-400 hover:text-zinc-200"
          style={{ borderColor: "var(--border)", background: "transparent" }}
        >
          <RefreshCw size={12} /> Retake
        </Link>
        <Link
          href="/labs"
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all hover:opacity-90"
          style={{ background: accent, color: "#fff" }}
        >
          Back to Labs
        </Link>
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-xl border p-4 flex items-start gap-3"
        style={{
          background: "rgba(227,170,80,0.05)",
          borderColor: "rgba(227,170,80,0.2)",
        }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(227,170,80,0.7)" }} />
        <div className="space-y-1">
          <p className="text-[11px] font-medium" style={{ color: "rgba(227,170,80,0.85)" }}>
            Shadow Labs is a self-reflection tool — not a clinical assessment
          </p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            These results are designed for self-observation and AI personalization only.
            They are one signal among many and should not replace professional guidance,
            therapy, or medical diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}
