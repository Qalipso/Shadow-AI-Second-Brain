"use client";

import { useEffect, useState } from "react";
import { saveSettings, loadSettings } from "@/lib/check-in";

// localStorage keys for AI behavior and mode
const MODE_KEY = "shadow:settings:mode";
const AI_KEY = "shadow:settings:ai-behavior";

export type ShadowMode = "observer" | "guide" | "analyst" | "coach";

type ModePreset = {
  id: ShadowMode;
  name: string;
  tagline: string;
  description: string;
  glyph: string;
  tone: "direct" | "analytical" | "soft" | "reflective";
  memoryDepth: "surface" | "contextual" | "deep";
  insightDepth: "light" | "normal" | "deep";
  questionsPerDay: 3 | 5 | 7;
};

const MODES: ReadonlyArray<ModePreset> = [
  {
    id: "observer",
    name: "Observer",
    tagline: "Quiet background presence",
    description: "Logs signals silently. No pressure, no push. Shadow watches and remembers basics.",
    glyph: "○",
    tone: "direct",
    memoryDepth: "surface",
    insightDepth: "light",
    questionsPerDay: 3,
  },
  {
    id: "guide",
    name: "Guide",
    tagline: "Gentle daily companion",
    description: "Active but soft. Recognizes patterns, offers gentle suggestions, checks in daily.",
    glyph: "◎",
    tone: "soft",
    memoryDepth: "contextual",
    insightDepth: "normal",
    questionsPerDay: 5,
  },
  {
    id: "analyst",
    name: "Analyst",
    tagline: "Deep pattern engine",
    description: "Connects signals across time, emotions, habits, life areas. Full memory. Full read.",
    glyph: "◈",
    tone: "analytical",
    memoryDepth: "deep",
    insightDepth: "deep",
    questionsPerDay: 7,
  },
  {
    id: "coach",
    name: "Coach",
    tagline: "Action-oriented momentum",
    description: "Cuts through noise. Identifies blockers. Pushes you toward one concrete next step.",
    glyph: "▶",
    tone: "direct",
    memoryDepth: "contextual",
    insightDepth: "deep",
    questionsPerDay: 5,
  },
];

function loadMode(): ShadowMode | null {
  if (typeof window === "undefined") return null;
  try {
    return (window.localStorage.getItem(MODE_KEY) as ShadowMode) ?? null;
  } catch {
    return null;
  }
}

function applyMode(mode: ModePreset) {
  try {
    // Update AI behavior settings
    const aiRaw = window.localStorage.getItem(AI_KEY);
    const ai = aiRaw ? JSON.parse(aiRaw) : {};
    window.localStorage.setItem(
      AI_KEY,
      JSON.stringify({
        ...ai,
        tone: mode.tone,
        memoryDepth: mode.memoryDepth,
        insightDepth: mode.insightDepth,
      }),
    );

    // Update check-in intensity
    const settings = loadSettings();
    saveSettings({ ...settings, questionsPerDay: mode.questionsPerDay });

    // Save mode selection
    window.localStorage.setItem(MODE_KEY, mode.id);

    // Notify other components
    window.dispatchEvent(new CustomEvent("shadow:mode:changed", { detail: mode.id }));
  } catch {
    // ignore
  }
}

export function ShadowModeSection() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<ShadowMode | null>(null);

  useEffect(() => {
    setMounted(true);
    setSelected(loadMode());
  }, []);

  function selectMode(mode: ModePreset) {
    setSelected(mode.id);
    applyMode(mode);
  }

  if (!mounted) {
    return (
      <section className="space-y-3">
        <header>
          <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-300">Shadow mode</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            How Shadow operates with you. Sets all AI behavior at once.
          </p>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl skeleton" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-300">Shadow mode</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          How Shadow operates with you. Sets all AI behavior at once.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MODES.map((mode) => {
          const active = selected === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => selectMode(mode)}
              className={`relative text-left rounded-xl border p-4 space-y-3 transition-all duration-200 ${
                active
                  ? "border-[var(--accent-warm)]/60 bg-[var(--accent-warm)]/5 card-glow"
                  : "border-[var(--border)] bg-[var(--bg-elev2)] hover:border-zinc-700 hover:bg-[var(--bg-elev3)]"
              }`}
            >
              {active && (
                <span className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)]" />
              )}
              <span
                className={`block text-2xl leading-none font-[family-name:var(--font-fraunces)] ${
                  active ? "text-[var(--accent-warm)]" : "text-zinc-600"
                }`}
              >
                {mode.glyph}
              </span>
              <div className="space-y-1">
                <p
                  className={`text-sm font-medium leading-none ${
                    active ? "text-zinc-100" : "text-zinc-300"
                  }`}
                >
                  {mode.name}
                </p>
                <p
                  className={`text-[10px] leading-snug ${
                    active ? "text-[var(--accent-warm)]/80" : "text-zinc-600"
                  }`}
                >
                  {mode.tagline}
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">{mode.description}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3">
          {(() => {
            const m = MODES.find((m) => m.id === selected);
            if (!m) return null;
            return (
              <>
                <span className="text-zinc-600 text-xs font-[family-name:var(--font-fraunces)]">
                  {m.glyph}
                </span>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-400">
                    <span className="text-zinc-200">{m.name}</span> mode active
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    Tone: {m.tone} · Memory: {m.memoryDepth} · Insights: {m.insightDepth} · Check-in:{" "}
                    {m.questionsPerDay} questions
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-600">
                  Fine-tune below ↓
                </span>
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}
