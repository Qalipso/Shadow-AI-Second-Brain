"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type LocalSettings,
} from "@/lib/check-in";
import {
  FieldRow,
  SectionGroup,
  SegmentedSelect,
  Toggle,
} from "./Rows";

type Mode = "random" | "core" | "mixed";
const MODES: ReadonlyArray<{ id: Mode; label: string }> = [
  { id: "random", label: "Random" },
  { id: "core", label: "Core" },
  { id: "mixed", label: "Mixed" },
];

export function CheckInSection() {
  const [mounted, setMounted] = useState(false);
  const [s, setS] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<Mode>("random");
  const [allowDeep, setAllowDeep] = useState(true);

  useEffect(() => {
    setMounted(true);
    setS(loadSettings());
  }, []);

  function update(patch: Partial<LocalSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
  }

  if (!mounted) return <div className="h-32 skeleton rounded-lg" />;

  return (
    <SectionGroup
      title="Check-in"
      description="How Shadow asks you each day."
    >
      <FieldRow
        label="Show check-in on first open"
        hint="Auto-opens the 5-question modal once per local day."
      >
        <Toggle
          checked={s.showQuestionsOnFirstOpen}
          onChange={(v) => update({ showQuestionsOnFirstOpen: v })}
        />
      </FieldRow>

      <FieldRow
        label="Questions per day"
        hint="More questions = richer signal, longer ritual."
      >
        <SegmentedSelect
          value={String(s.questionsPerDay) as "3" | "5" | "7"}
          options={[
            { id: "3", label: "3" },
            { id: "5", label: "5" },
            { id: "7", label: "7" },
          ]}
          onChange={(v) => update({ questionsPerDay: Number(v) })}
        />
      </FieldRow>

      <FieldRow
        label="Question mode"
        hint="Random rotation, fixed core, or mixed."
        comingSoon
      >
        <SegmentedSelect value={mode} options={MODES} onChange={setMode} />
      </FieldRow>

      <FieldRow
        label="Allow deep questions"
        hint="Lets Shadow ask more emotionally loaded questions."
        comingSoon
      >
        <Toggle checked={allowDeep} onChange={setAllowDeep} />
      </FieldRow>
    </SectionGroup>
  );
}
