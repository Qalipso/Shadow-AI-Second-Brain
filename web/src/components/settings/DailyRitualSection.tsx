"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  CADENCE_LABEL,
  type CheckinCadence,
  type LocalSettings,
} from "@/lib/check-in";
import {
  DescriptiveSelect,
  FieldRow,
  SectionGroup,
  SegmentedSelect,
  Toggle,
} from "./Rows";

type QuestionStyle = "core" | "adaptive" | "exploratory";

const STYLE_KEY = "shadow:settings:daily-ritual";

type RitualPrefs = {
  questionStyle: QuestionStyle;
  allowDeep: boolean;
};

const RITUAL_DEFAULTS: RitualPrefs = {
  questionStyle: "core",
  allowDeep: true,
};

function loadRitual(): RitualPrefs {
  if (typeof window === "undefined") return RITUAL_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STYLE_KEY);
    if (!raw) return RITUAL_DEFAULTS;
    return { ...RITUAL_DEFAULTS, ...(JSON.parse(raw) as Partial<RitualPrefs>) };
  } catch {
    return RITUAL_DEFAULTS;
  }
}

function saveRitual(p: RitualPrefs) {
  try {
    window.localStorage.setItem(STYLE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

const INTENSITY_OPTS = [
  {
    id: "3" as const,
    label: "Light",
    description: "3 questions. Quick pulse check.",
  },
  {
    id: "5" as const,
    label: "Balanced",
    description: "5 questions. Good signal-to-time ratio.",
  },
  {
    id: "7" as const,
    label: "Deep",
    description: "7 questions. Full self-scan.",
  },
];

const CADENCE_OPTS: ReadonlyArray<{ id: CheckinCadence; label: string; description: string }> = [
  { id: "15m",    label: CADENCE_LABEL["15m"],    description: "Frequent gentle pulses." },
  { id: "1h",     label: CADENCE_LABEL["1h"],     description: "Hourly nudge if you forget." },
  { id: "4h",     label: CADENCE_LABEL["4h"],     description: "Four checkpoints per workday." },
  { id: "2x_day", label: CADENCE_LABEL["2x_day"], description: "Morning and evening." },
  { id: "1x_day", label: CADENCE_LABEL["1x_day"], description: "One quiet daily reminder." },
  { id: "off",    label: CADENCE_LABEL["off"],    description: "Shadow stays silent until you open it." },
];

const STYLE_OPTS: ReadonlyArray<{ id: QuestionStyle; label: string; description: string }> = [
  { id: "core", label: "Core", description: "Stable foundational questions." },
  { id: "adaptive", label: "Adaptive", description: "Changes based on recent signals." },
  { id: "exploratory", label: "Exploratory", description: "Adds unexpected reflective questions." },
];

export function DailyRitualSection() {
  const [mounted, setMounted] = useState(false);
  const [s, setS] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [ritual, setRitual] = useState<RitualPrefs>(RITUAL_DEFAULTS);

  useEffect(() => {
    setMounted(true);
    setS(loadSettings());
    setRitual(loadRitual());
  }, []);

  function updateSettings(patch: Partial<LocalSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
  }

  function updateRitual(patch: Partial<RitualPrefs>) {
    const next = { ...ritual, ...patch };
    setRitual(next);
    saveRitual(next);
  }

  if (!mounted) return <div className="h-48 skeleton rounded-lg" />;

  return (
    <SectionGroup
      title="Daily ritual"
      description="How Shadow checks in with you each day."
    >
      <FieldRow
        label="Show check-in on first open"
        hint="Auto-opens your daily check-in once per local day."
      >
        <Toggle
          checked={s.showQuestionsOnFirstOpen}
          onChange={(v) => updateSettings({ showQuestionsOnFirstOpen: v })}
        />
      </FieldRow>

      <FieldRow
        stacked
        label="Proactive check-in cadence"
        hint="How often Shadow may surface a proactive hint. Off keeps Shadow silent until you open it."
      >
        <DescriptiveSelect
          value={s.checkinCadence}
          options={CADENCE_OPTS}
          onChange={(v) => updateSettings({ checkinCadence: v })}
        />
      </FieldRow>

      <FieldRow stacked label="Daily check-in intensity" hint="How many questions per check-in.">
        <DescriptiveSelect
          value={String(s.questionsPerDay) as "3" | "5" | "7"}
          options={INTENSITY_OPTS}
          onChange={(v) => updateSettings({ questionsPerDay: Number(v) })}
        />
      </FieldRow>

      <FieldRow stacked label="Question style" hint="How Shadow selects questions for you.">
        <DescriptiveSelect
          value={ritual.questionStyle}
          options={STYLE_OPTS}
          onChange={(v) => updateRitual({ questionStyle: v })}
        />
      </FieldRow>

      <FieldRow
        label="Allow deep questions"
        hint={
          ritual.allowDeep
            ? "Lets Shadow ask more emotionally loaded questions when needed."
            : "Shadow will avoid intense personal questions."
        }
      >
        <Toggle
          checked={ritual.allowDeep}
          onChange={(v) => updateRitual({ allowDeep: v })}
        />
      </FieldRow>
    </SectionGroup>
  );
}
