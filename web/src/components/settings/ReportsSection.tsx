"use client";

import { useEffect, useState } from "react";
import {
  DescriptiveSelect,
  FieldRow,
  MultiSelect,
  SectionGroup,
  SegmentedSelect,
} from "./Rows";

type ReportLength = "short" | "medium" | "detailed";
type ReportFrequency = "daily" | "weekly" | "both";
type ReportFocus =
  | "state"
  | "tasks"
  | "goals"
  | "life_circle"
  | "emotional"
  | "money"
  | "health"
  | "creativity";

const KEY = "shadow:settings:reports";

type ReportPrefs = {
  length: ReportLength;
  frequency: ReportFrequency;
  focus: ReportFocus[];
};

const DEFAULTS: ReportPrefs = {
  length: "medium",
  frequency: "daily",
  focus: ["state", "tasks"],
};

function load(): ReportPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReportPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

function save(p: ReportPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

const LENGTH_OPTS: ReadonlyArray<{ id: ReportLength; label: string; description: string }> = [
  { id: "short", label: "Short", description: "Only key signals and actions." },
  { id: "medium", label: "Medium", description: "Balanced summary with patterns." },
  { id: "detailed", label: "Detailed", description: "Full reflection with deeper context." },
];

const FREQUENCY_OPTS: ReadonlyArray<{ id: ReportFrequency; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "both", label: "Both" },
];

const FOCUS_OPTS: ReadonlyArray<{ id: ReportFocus; label: string }> = [
  { id: "state", label: "State" },
  { id: "tasks", label: "Tasks" },
  { id: "goals", label: "Goals" },
  { id: "life_circle", label: "Life Circle" },
  { id: "emotional", label: "Emotional patterns" },
  { id: "money", label: "Money" },
  { id: "health", label: "Health" },
  { id: "creativity", label: "Creativity" },
];

export function ReportsSection() {
  const [mounted, setMounted] = useState(false);
  const [p, setP] = useState<ReportPrefs>(DEFAULTS);

  useEffect(() => {
    setMounted(true);
    setP(load());
  }, []);

  function update(patch: Partial<ReportPrefs>) {
    const next = { ...p, ...patch };
    setP(next);
    save(next);
  }

  if (!mounted) return <div className="h-36 skeleton rounded-lg" />;

  return (
    <SectionGroup
      title="Reports"
      description="How Shadow summarizes your days and weeks."
    >
      <FieldRow stacked label="Report length" hint="How verbose Shadow's reports are.">
        <DescriptiveSelect
          value={p.length}
          options={LENGTH_OPTS}
          onChange={(v) => update({ length: v })}
        />
      </FieldRow>

      <FieldRow label="Report frequency" hint="When Shadow generates reports.">
        <SegmentedSelect
          value={p.frequency}
          options={FREQUENCY_OPTS}
          onChange={(v) => update({ frequency: v })}
        />
      </FieldRow>

      <FieldRow stacked label="Report focus" hint="Areas Shadow emphasizes in reports. Pick multiple.">
        <MultiSelect
          value={p.focus}
          options={FOCUS_OPTS}
          onChange={(v) => update({ focus: v as ReportFocus[] })}
        />
      </FieldRow>
    </SectionGroup>
  );
}
