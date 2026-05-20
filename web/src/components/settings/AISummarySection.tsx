"use client";

import { useEffect, useState } from "react";
import { Brain, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ProfileAiSummary } from "@/types/db";

type PersonalityJson = Record<string, unknown>;
type ValuesJson = Record<string, unknown>;
type StateJson = Record<string, unknown>;
type CommPrefsJson = {
  tone_style?: string;
  motivation_approach?: string;
  planning_style?: string;
  risk_zones?: string[];
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-500 mb-1.5">{label}</p>
      <div className="text-[12px] text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-zinc-500 capitalize w-28 flex-shrink-0">{label.replace(/_/g, " ")}</span>
      <div className="flex-1 h-0.5 rounded-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: "linear-gradient(90deg, var(--accent-cool), var(--accent-warm))",
          }}
        />
      </div>
      <span className="text-[11px] text-zinc-400 w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

export function AISummarySection() {
  const [summary, setSummary] = useState<ProfileAiSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/ai-summary")
      .then((r) => r.json())
      .then((d) => setSummary(d.summary ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-zinc-500 text-[12px]">
        <Loader2 size={13} className="animate-spin" /> Loading AI summary...
      </div>
    );
  }

  if (!summary || !summary.last_generated_at) {
    return (
      <div className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: "var(--accent-cool)" }} />
          <p className="text-[13px] font-semibold text-zinc-200">AI Profile Summary</p>
        </div>
        <p className="text-[12px] text-zinc-500">
          No AI summary yet. Complete tests in Labs to build your psychological profile.
        </p>
        <Link
          href="/labs"
          className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all"
          style={{
            color: "var(--accent-cool)",
            borderColor: "rgba(109,123,255,0.3)",
            background: "rgba(109,123,255,0.08)",
          }}
        >
          Open Labs <ExternalLink size={10} />
        </Link>
      </div>
    );
  }

  const personality = (summary.personality_json ?? {}) as PersonalityJson;
  const values = (summary.values_json ?? {}) as ValuesJson;
  const state = (summary.current_state_json ?? {}) as StateJson;
  const commPrefs = (summary.communication_preferences_json ?? {}) as CommPrefsJson;

  const lastDate = new Date(summary.last_generated_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  const personalityScores = Object.entries(personality).filter(([, v]) => typeof v === "number") as [string, number][];
  const valueScores = Object.entries(values).filter(([, v]) => typeof v === "number") as [string, number][];
  const stateScores = Object.entries(state).filter(([, v]) => typeof v === "number") as [string, number][];
  const topValues = [...valueScores].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: "var(--accent-cool)" }} />
          <p className="text-[13px] font-semibold text-zinc-200">AI Profile Summary</p>
        </div>
        <span className="text-[10px] text-zinc-600">Updated {lastDate}</span>
      </div>

      {/* Summary text */}
      {summary.summary_text && (
        <Section label="Portrait">
          <p>{summary.summary_text}</p>
        </Section>
      )}

      {/* Personality */}
      {personalityScores.length > 0 && (
        <Section label="Personality Dimensions">
          <div className="space-y-2">
            {personalityScores.map(([dim, score]) => (
              <ScoreBar key={dim} label={dim} value={score} />
            ))}
          </div>
        </Section>
      )}

      {/* Values */}
      {topValues.length > 0 && (
        <Section label="Top Motivators">
          <div className="flex flex-wrap gap-2">
            {topValues.map(([val]) => (
              <span
                key={val}
                className="text-[11px] px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: "rgba(201,163,106,0.12)",
                  color: "var(--accent-warm)",
                  border: "1px solid rgba(201,163,106,0.25)",
                }}
              >
                {val.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Current state */}
      {stateScores.length > 0 && (
        <Section label="Current State">
          <div className="space-y-2">
            {stateScores.map(([dim, score]) => (
              <ScoreBar key={dim} label={dim} value={score} />
            ))}
          </div>
        </Section>
      )}

      {/* Communication */}
      {commPrefs.tone_style && (
        <Section label="How Shadow Talks to You">
          <p>{commPrefs.tone_style}</p>
          {commPrefs.motivation_approach && (
            <p className="mt-1 text-zinc-500">{commPrefs.motivation_approach}</p>
          )}
        </Section>
      )}

      {/* Risk zones */}
      {commPrefs.risk_zones && commPrefs.risk_zones.length > 0 && (
        <Section label="Risk Zones">
          <div className="flex flex-wrap gap-2">
            {commPrefs.risk_zones.map((rz, i) => (
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
        </Section>
      )}

      <div className="pt-2">
        <Link
          href="/labs"
          className="inline-flex items-center gap-1.5 text-[11px] transition-colors text-zinc-500 hover:text-zinc-300"
        >
          Update via Labs <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}
