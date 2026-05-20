"use client";

import { SelfKnowledgeIndex } from "./SelfKnowledgeIndex";
import { TestCard } from "./TestCard";
import type { LabsTest } from "@/types/db";

type TestWithStatus = LabsTest & {
  completed: boolean;
  lastSession?: { completed_at?: string | null } | null;
};

type LabsViewProps = {
  tests: TestWithStatus[];
};

export function LabsView({ tests }: LabsViewProps) {
  const completedCount = tests.filter((t) => t.completed).length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border px-7 py-8"
        style={{
          borderColor: "rgba(109,123,255,0.15)",
          background: "linear-gradient(135deg, rgba(13,13,22,0.98) 0%, rgba(8,8,18,1) 100%)",
        }}
      >
        {/* Ambient blooms */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #6D7BFF 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-16 right-8 w-56 h-56 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #C9A36A 0%, transparent 70%)" }} />

        <div className="relative space-y-2 max-w-xl">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--shadow-text-faint)]">
            Shadow / Labs
          </p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl md:text-3xl text-gradient-subtle leading-tight">
            Self-Knowledge Engine
          </h2>
          <p className="text-sm text-[var(--shadow-text-muted)] leading-relaxed">
            Structured modules that calibrate Shadow to your psychology, values, and current state.
            Each scan sharpens the AI layer.
          </p>
        </div>

        {/* Disclaimer inline */}
        <p className="relative mt-5 text-[10px] text-zinc-500 leading-relaxed border-t pt-4"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          Not a medical diagnosis. Labs structure self-reflection and improve AI personalization.
        </p>
      </div>

      {/* Self-Knowledge Index */}
      <SelfKnowledgeIndex completedCount={completedCount} totalCount={tests.length} />

      {/* Section: Available Tests */}
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.28em] mb-4 text-[var(--shadow-text-faint)]">
          Available Modules
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tests.map((test) => (
            <TestCard
              key={test.slug}
              slug={test.slug}
              title={test.title}
              description={test.description}
              category={test.category}
              estimatedMinutes={test.estimated_minutes}
              completed={test.completed}
              lastCompletedAt={test.lastSession?.completed_at}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
