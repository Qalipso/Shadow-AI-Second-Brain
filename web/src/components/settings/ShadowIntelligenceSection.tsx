"use client";

import { useEffect, useState } from "react";
import {
  DescriptiveSelect,
  FieldRow,
  SectionGroup,
  Toggle,
} from "./Rows";

type Tone = "direct" | "analytical" | "soft" | "reflective";
type MemoryDepth = "surface" | "contextual" | "deep";
type InsightDepth = "light" | "normal" | "deep";

const KEY = "shadow:settings:ai-behavior";

type ShadowPrefs = {
  tone: Tone;
  memoryDepth: MemoryDepth;
  insightDepth: InsightDepth;
  showConfidence: boolean;
};

const DEFAULTS: ShadowPrefs = {
  tone: "direct",
  memoryDepth: "contextual",
  insightDepth: "normal",
  showConfidence: false,
};

function load(): ShadowPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ShadowPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

function save(p: ShadowPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

const TONE_OPTS: ReadonlyArray<{ id: Tone; label: string; description: string }> = [
  { id: "direct", label: "Direct", description: "Short, clear, action-oriented." },
  { id: "analytical", label: "Analytical", description: "Pattern-focused and structured." },
  { id: "soft", label: "Soft", description: "Gentle, supportive, low-pressure." },
  { id: "reflective", label: "Reflective", description: "Deeper, slower, meaning-oriented." },
];

const MEMORY_OPTS: ReadonlyArray<{ id: MemoryDepth; label: string; description: string }> = [
  { id: "surface", label: "Surface", description: "Remembers tasks, facts and explicit notes." },
  { id: "contextual", label: "Contextual", description: "Remembers recurring themes and patterns." },
  { id: "deep", label: "Deep", description: "Connects emotions, goals, habits and life areas." },
];

const INSIGHT_OPTS: ReadonlyArray<{ id: InsightDepth; label: string; description: string }> = [
  { id: "light", label: "Light", description: "Simple summaries and obvious patterns." },
  { id: "normal", label: "Normal", description: "Balanced insights with useful connections." },
  { id: "deep", label: "Deep", description: "Stronger pattern detection and emotional context." },
];

export function ShadowIntelligenceSection() {
  const [mounted, setMounted] = useState(false);
  const [p, setP] = useState<ShadowPrefs>(DEFAULTS);

  useEffect(() => {
    setMounted(true);
    setP(load());
  }, []);

  function update(patch: Partial<ShadowPrefs>) {
    const next = { ...p, ...patch };
    setP(next);
    save(next);
  }

  if (!mounted) return <div className="h-48 skeleton rounded-lg" />;

  return (
    <SectionGroup
      title="Shadow intelligence"
      description="How Shadow thinks and talks back."
    >
      <FieldRow stacked label="Tone" hint="Shadow's voice in reports and reads.">
        <DescriptiveSelect
          value={p.tone}
          options={TONE_OPTS}
          onChange={(v) => update({ tone: v })}
        />
      </FieldRow>

      <FieldRow stacked label="Memory depth" hint="How far back Shadow looks when analyzing.">
        <DescriptiveSelect
          value={p.memoryDepth}
          options={MEMORY_OPTS}
          onChange={(v) => update({ memoryDepth: v })}
        />
      </FieldRow>

      <FieldRow stacked label="Insight depth" hint="How deeply Shadow interprets your signals.">
        <DescriptiveSelect
          value={p.insightDepth}
          options={INSIGHT_OPTS}
          onChange={(v) => update({ insightDepth: v })}
        />
      </FieldRow>

      <FieldRow
        label="Show confidence levels"
        hint="Shows how certain Shadow is about classifications and insights."
      >
        <Toggle
          checked={p.showConfidence}
          onChange={(v) => update({ showConfidence: v })}
        />
      </FieldRow>
    </SectionGroup>
  );
}
