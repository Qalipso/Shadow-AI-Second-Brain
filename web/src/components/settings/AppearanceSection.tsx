"use client";

import { useEffect, useState } from "react";
import {
  FieldRow,
  SectionGroup,
  SegmentedSelect,
  Toggle,
} from "./Rows";

type Density = "compact" | "expanded";
const KEY = "shadow:settings:appearance";

type Appearance = {
  density: Density;
  reduceMotion: boolean;
};

const DEFAULTS: Appearance = { density: "expanded", reduceMotion: false };

function load(): Appearance {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Appearance>) };
  } catch {
    return DEFAULTS;
  }
}

function save(p: Appearance) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function AppearanceSection() {
  const [mounted, setMounted] = useState(false);
  const [p, setP] = useState<Appearance>(DEFAULTS);

  useEffect(() => {
    setMounted(true);
    setP(load());
  }, []);

  function update(patch: Partial<Appearance>) {
    const next = { ...p, ...patch };
    setP(next);
    save(next);
    if (patch.reduceMotion !== undefined) {
      document.documentElement.dataset.reduceMotion = patch.reduceMotion
        ? "true"
        : "false";
    }
    if (patch.density) {
      document.documentElement.dataset.density = patch.density;
    }
  }

  if (!mounted) return <div className="h-24 skeleton rounded-lg" />;

  return (
    <SectionGroup
      title="Appearance"
      description="Visual density and motion."
    >
      <FieldRow label="Theme" hint="Dark-only for now.">
        <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
          Dark
        </span>
      </FieldRow>
      <FieldRow
        label="Dashboard density"
        hint="Compact tightens spacing; expanded breathes."
      >
        <SegmentedSelect
          value={p.density}
          options={[
            { id: "compact", label: "Compact" },
            { id: "expanded", label: "Expanded" },
          ]}
          onChange={(v) => update({ density: v })}
        />
      </FieldRow>
      <FieldRow
        label="Reduce visual effects"
        hint="Disables fade, stagger, and shimmer animations."
      >
        <Toggle
          checked={p.reduceMotion}
          onChange={(v) => update({ reduceMotion: v })}
        />
      </FieldRow>
    </SectionGroup>
  );
}
