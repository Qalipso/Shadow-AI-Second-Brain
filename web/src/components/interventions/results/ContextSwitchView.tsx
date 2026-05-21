"use client";
import { DecryptText } from "@/components/fx";

export type ContextSwitchResult = {
  kind: "context_switch";
  title: string;
  physical: string;
  sensory: string;
  mental: string;
  mantra: string;
  firstAction: string;
};

export function ContextSwitchView({ result }: { result: ContextSwitchResult }) {
  return (
    <div className="space-y-4">
      <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--shadow-text)]">
        <DecryptText text={result.title} duration={1.0} />
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Physical", value: result.physical },
          { label: "Sensory", value: result.sensory },
          { label: "Mental", value: result.mental },
        ].map((b) => (
          <div key={b.label} className="rounded-lg bg-[rgba(20,20,30,0.5)] p-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-2">
              {b.label}
            </p>
            <p className="text-sm text-[var(--shadow-text)] leading-relaxed">{b.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-[rgba(28,26,38,0.6)] p-3 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-1.5">
          Mantra
        </p>
        <p className="font-[family-name:var(--font-fraunces)] italic text-[var(--shadow-text)]">
          &ldquo;{result.mantra}&rdquo;
        </p>
      </div>
    </div>
  );
}
