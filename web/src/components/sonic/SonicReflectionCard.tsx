"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SonicReflection } from "@/types/spotify";
import { CONFIDENCE_META } from "@/types/spotify";
import { Card } from "@/components/Card";

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  const meta = CONFIDENCE_META[level];
  return (
    <span
      className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full"
      style={{
        color: meta.color,
        background: meta.color.replace(/[\d.]+\)$/, "0.1)"),
        border: `1px solid ${meta.color.replace(/[\d.]+\)$/, "0.25)")}`,
      }}
    >
      {meta.label}
    </span>
  );
}

function LifeAreaChip({ area }: { area: string }) {
  return (
    <span
      className="text-[9px] font-mono px-2 py-0.5 rounded-full"
      style={{
        color: "rgba(126,87,194,0.9)",
        background: "rgba(126,87,194,0.08)",
        border: "1px solid rgba(126,87,194,0.18)",
      }}
    >
      {area}
    </span>
  );
}

export function SonicReflectionCard({
  reflection: initial,
  labelCount,
}: {
  reflection: SonicReflection | null;
  labelCount: number;
}) {
  const router = useRouter();
  const [reflection, setReflection] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/music/sonic-reflection", { method: "POST" });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError((d as { error?: string }).error ?? "Generation failed.");
          return;
        }
        const d = await res.json() as { reflection: SonicReflection };
        setReflection(d.reflection);
        router.refresh();
      } catch {
        setError("Network error.");
      }
    });
  }

  const canGenerate = labelCount >= 1;

  if (!reflection) {
    return (
      <Card title="Sonic Reflection">
        <div className="space-y-3">
          <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
            No reflection generated yet.
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--shadow-text-faint)" }}>
            {canGenerate
              ? "Confirm at least one label below, then generate your first reflection."
              : "Confirm labels for your artists and tracks below to generate a reflection."}
          </p>
          {canGenerate && (
            <button
              onClick={generate}
              disabled={isPending}
              className="mt-1 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all disabled:opacity-50"
              style={{
                background: "rgba(126,87,194,0.12)",
                border: "1px solid rgba(126,87,194,0.25)",
                color: "rgba(126,87,194,0.9)",
              }}
            >
              {isPending ? "Generating…" : "Generate Reflection"}
            </button>
          )}
          {error && (
            <p className="text-[11px]" style={{ color: "rgba(172,82,101,0.9)" }}>{error}</p>
          )}
        </div>
      </Card>
    );
  }

  const confidence = (reflection.confidence ?? "low") as "low" | "medium" | "high";

  return (
    <Card
      title="Sonic Reflection"
      action={<ConfidenceBadge level={confidence} />}
    >
      <div className="space-y-4">
        {/* Title + summary */}
        <div>
          {reflection.title && (
            <h3
              className="text-[16px] font-[family-name:var(--font-fraunces)] font-light mb-1.5 leading-snug"
              style={{ color: "var(--shadow-text)" }}
            >
              {reflection.title}
            </h3>
          )}
          {reflection.summary && (
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
              {reflection.summary}
            </p>
          )}
        </div>

        {/* Patterns */}
        {reflection.patterns.length > 0 && (
          <div>
            <p
              className="text-[9px] font-mono uppercase tracking-[0.2em] mb-2"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Patterns
            </p>
            <ul className="space-y-1.5">
              {reflection.patterns.map((p, i) => (
                <li
                  key={i}
                  className="text-[11px] leading-relaxed pl-3 border-l"
                  style={{
                    color: "var(--shadow-text-muted)",
                    borderColor: "rgba(126,87,194,0.2)",
                  }}
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible meanings */}
        {reflection.possible_meanings.length > 0 && (
          <div>
            <p
              className="text-[9px] font-mono uppercase tracking-[0.2em] mb-2"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Possible meanings
            </p>
            <ul className="space-y-1.5">
              {reflection.possible_meanings.map((m, i) => (
                <li
                  key={i}
                  className="text-[11px] leading-relaxed pl-3 border-l"
                  style={{
                    color: "var(--shadow-text-muted)",
                    borderColor: "rgba(224,178,92,0.2)",
                  }}
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Life areas */}
        {reflection.linked_life_areas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reflection.linked_life_areas.map((a) => (
              <LifeAreaChip key={a} area={a} />
            ))}
          </div>
        )}

        {/* Confidence note */}
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--shadow-text-faint)" }}>
          {CONFIDENCE_META[confidence].note}
        </p>

        {/* User question */}
        {reflection.user_question && (
          <div
            className="rounded-lg p-3"
            style={{
              background: "rgba(126,87,194,0.05)",
              border: "1px solid rgba(126,87,194,0.12)",
            }}
          >
            <p
              className="text-[9px] font-mono uppercase tracking-[0.2em] mb-1.5"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Reflect
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
              {reflection.user_question}
            </p>
          </div>
        )}

        {/* Regenerate */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={generate}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all disabled:opacity-50"
            style={{
              background: "rgba(126,87,194,0.08)",
              border: "1px solid rgba(126,87,194,0.18)",
              color: "rgba(126,87,194,0.8)",
            }}
          >
            {isPending ? "Generating…" : "Regenerate"}
          </button>
          <p className="text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
            This is a pattern interpretation, not a diagnosis.
          </p>
        </div>

        {error && (
          <p className="text-[11px]" style={{ color: "rgba(172,82,101,0.9)" }}>{error}</p>
        )}
      </div>
    </Card>
  );
}
