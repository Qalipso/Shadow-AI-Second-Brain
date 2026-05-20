import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Layers, RefreshCw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLabsTestBySlug, getUserSessionsForTest } from "@/lib/labs/queries";
import { StartTestButton } from "@/components/labs/StartTestButton";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  personality: "Personality",
  values: "Values & Motivation",
  state: "Current State",
};

const CATEGORY_ACCENT: Record<string, string> = {
  personality: "var(--accent-cool)",
  values: "var(--accent-warm)",
  state: "#6FBF8A",
};

const CATEGORY_ACCENT_HEX: Record<string, string> = {
  personality: "#6D7BFF",
  values: "#C9A36A",
  state: "#6FBF8A",
};

const WHAT_MEASURES: Record<string, { dimensions: string[]; summary: string }> = {
  personality: {
    dimensions: ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Emotional Depth"],
    summary:
      "Five core personality dimensions from the Big Five framework. Shadow uses this to personalize tone, motivation framing, and planning structure.",
  },
  values: {
    dimensions: ["Autonomy", "Achievement", "Security", "Creativity", "Stimulation", "Connection", "Care", "Status", "Pleasure", "Meaning"],
    summary:
      "Ten motivational value domains. Shadow uses this to connect your goals to your real underlying drivers.",
  },
  state: {
    dimensions: ["Physical Energy", "Emotional State", "Recovery", "Cognitive Load", "Wellbeing"],
    summary:
      "Five current-state dimensions. Shadow uses this to adapt its responses to your actual capacity today.",
  },
};

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const test = await getLabsTestBySlug(slug);
  if (!test) notFound();

  const sessions = user ? await getUserSessionsForTest(user.id, test.id) : [];
  const lastSession = sessions[0] ?? null;
  const accent = CATEGORY_ACCENT[test.category ?? ""] ?? "var(--accent-cool)";
  const accentHex = CATEGORY_ACCENT_HEX[test.category ?? ""] ?? "#6D7BFF";
  const categoryLabel = CATEGORY_LABELS[test.category ?? ""] ?? test.category ?? "";
  const measures = WHAT_MEASURES[test.category ?? ""];

  return (
    <div className="anim-fade-in max-w-2xl space-y-5">
      {/* Back */}
      <Link
        href="/labs"
        className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <ArrowLeft size={12} /> Labs
      </Link>

      {/* Hero card */}
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          background: `linear-gradient(160deg, rgba(20,20,27,0.95) 0%, rgba(12,12,18,0.98) 100%)`,
          borderColor: `${accentHex}20`,
        }}
      >
        {/* Ambient glow top-right */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${accentHex} 0%, transparent 70%)` }}
        />

        <div className="relative p-7 pb-6">
          {/* Category + meta row */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-[9px] font-mono uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border"
              style={{
                color: accent,
                borderColor: `${accentHex}35`,
                background: `${accentHex}0d`,
              }}
            >
              {categoryLabel}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1">
                <Clock size={10} /> {test.estimated_minutes} min
              </span>
              <span className="flex items-center gap-1">
                <Layers size={10} /> v{test.version}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-[30px] font-[family-name:var(--font-fraunces)] leading-[1.15] mb-3"
            style={{
              background: `linear-gradient(140deg, #e8e8f0 0%, ${accentHex} 120%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {test.title}
          </h1>

          <p className="text-[13px] text-zinc-400 leading-relaxed max-w-lg">{test.description}</p>

          {/* Last taken note */}
          {lastSession && (
            <p className="mt-4 flex items-center gap-1.5 text-[10px] text-zinc-600">
              <RefreshCw size={10} />
              Last completed{" "}
              {new Date(lastSession.completed_at!).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* What this measures */}
      {measures && (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{
            background: "rgba(18,18,24,0.7)",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-600">
            What This Measures
          </p>
          <p className="text-[12px] text-zinc-400 leading-relaxed">{measures.summary}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {measures.dimensions.map((dim) => (
              <span
                key={dim}
                className="text-[10px] px-2.5 py-0.5 rounded-full border"
                style={{
                  color: "rgba(255,255,255,0.35)",
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {dim}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer for state check */}
      {test.category === "state" && (
        <div
          className="rounded-lg border px-4 py-3 text-[11px] text-zinc-600 leading-relaxed"
          style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}
        >
          Not a medical or clinical assessment. Results are for self-reflection and AI personalization only.
        </div>
      )}

      {/* CTA */}
      <StartTestButton testSlug={test.slug} accent={accent} />
    </div>
  );
}
