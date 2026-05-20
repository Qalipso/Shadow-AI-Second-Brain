"use client";

import { useEffect, useState } from "react";
import {
  FieldRow,
  SectionGroup,
  SegmentedSelect,
  Toggle,
} from "./Rows";

type Tone = "direct" | "analytical" | "soft" | "reflective";
type Depth = "light" | "normal" | "deep";
type Length = "short" | "medium" | "detailed";

const KEY = "shadow:settings:ai-behavior";

type AIPrefs = {
  tone: Tone;
  depth: Depth;
  length: Length;
  showConfidence: boolean;
};

const DEFAULTS: AIPrefs = {
  tone: "direct",
  depth: "normal",
  length: "medium",
  showConfidence: false,
};

function load(): AIPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AIPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

function save(p: AIPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

const TONE_OPTS = [
  { id: "direct", label: "Direct" },
  { id: "analytical", label: "Analytical" },
  { id: "soft", label: "Soft" },
  { id: "reflective", label: "Reflective" },
] as const;

const DEPTH_OPTS = [
  { id: "light", label: "Light" },
  { id: "normal", label: "Normal" },
  { id: "deep", label: "Deep" },
] as const;

const LENGTH_OPTS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "detailed", label: "Detailed" },
] as const;

export function AIBehaviorSection() {
  const [mounted, setMounted] = useState(false);
  const [p, setP] = useState<AIPrefs>(DEFAULTS);

  useEffect(() => {
    setMounted(true);
    setP(load());
  }, []);

  function update(patch: Partial<AIPrefs>) {
    const next = { ...p, ...patch };
    setP(next);
    save(next);
  }

  if (!mounted) return <div className="h-32 skeleton rounded-lg" />;

  return (
    <SectionGroup
      title="AI behavior"
      description="How Shadow talks back."
    >
      <FieldRow label="Tone" hint="Shadow’s voice in reports and replies.">
        <SegmentedSelect
          value={p.tone}
          options={TONE_OPTS}
          onChange={(v) => update({ tone: v })}
        />
      </FieldRow>
      <FieldRow
        label="Insight depth"
        hint="How far Shadow digs in summaries."
      >
        <SegmentedSelect
          value={p.depth}
          options={DEPTH_OPTS}
          onChange={(v) => update({ depth: v })}
        />
      </FieldRow>
      <FieldRow
        label="Report length"
        hint="Daily report verbosity."
      >
        <SegmentedSelect
          value={p.length}
          options={LENGTH_OPTS}
          onChange={(v) => update({ length: v })}
        />
      </FieldRow>
      <FieldRow
        label="Show confidence levels"
        hint="Surface Shadow’s certainty on classifications and insights."
      >
        <Toggle
          checked={p.showConfidence}
          onChange={(v) => update({ showConfidence: v })}
        />
      </FieldRow>
    </SectionGroup>
  );
}
