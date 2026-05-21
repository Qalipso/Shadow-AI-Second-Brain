"use client";

import { useState } from "react";
import { X, Plus, Sparkles, ChevronDown } from "lucide-react";
import type { Goal } from "@/types/db";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (goal: Goal) => void;
}

const LIFE_AREAS = [
  "health", "sleep", "energy", "money", "career", "learning",
  "creativity", "relationships", "discipline", "emotions", "home", "meaning",
] as const;

const GOAL_TYPES = [
  { value: "outcome",    label: "Outcome",    hint: "Achieve a result" },
  { value: "identity",   label: "Identity",   hint: "Become someone" },
  { value: "recovery",   label: "Recovery",   hint: "Heal or restore" },
  { value: "skill",      label: "Skill",      hint: "Build capability" },
  { value: "project",    label: "Project",    hint: "Complete a thing" },
  { value: "experiment", label: "Experiment", hint: "Test and learn" },
] as const;

type GoalType = typeof GOAL_TYPES[number]["value"];
type Level = "low" | "medium" | "high";

const LEVELS: { value: Level; label: string; score: number }[] = [
  { value: "low",    label: "Low",    score: 3 },
  { value: "medium", label: "Medium", score: 6 },
  { value: "high",   label: "High",   score: 9 },
];

// ─── AI Suggestions panel ────────────────────────────────────────────────────
interface AiSuggestions {
  refinedTitle: string;
  suggestedAreas: string[];
  firstMission: string;
  firstTask: string;
}

const VALID_AREAS = [
  "health", "sleep", "energy", "money", "career", "learning",
  "creativity", "relationships", "discipline", "emotions", "home", "meaning",
];

function parseAiSuggestions(reply: string, fallbackTitle: string): AiSuggestions {
  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<AiSuggestions>;
      return {
        refinedTitle: typeof parsed.refinedTitle === "string" && parsed.refinedTitle.trim()
          ? parsed.refinedTitle.trim()
          : fallbackTitle,
        suggestedAreas: Array.isArray(parsed.suggestedAreas)
          ? parsed.suggestedAreas.filter((a): a is string => VALID_AREAS.includes(a as string))
          : [],
        firstMission: typeof parsed.firstMission === "string" ? parsed.firstMission : "",
        firstTask: typeof parsed.firstTask === "string" ? parsed.firstTask : "",
      };
    }
  } catch {
    // fall through to defaults
  }
  return { refinedTitle: fallbackTitle, suggestedAreas: [], firstMission: "", firstTask: "" };
}

// ─── Level picker ─────────────────────────────────────────────────────────────
function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Level | null;
  onChange: (v: Level) => void;
}) {
  return (
    <div>
      <span
        className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
        style={{ color: "var(--shadow-text-muted)" }}
      >
        {label}
      </span>
      <div className="flex gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-mono transition-all"
            style={
              value === l.value
                ? {
                    background: "rgba(201,163,106,0.12)",
                    border: "1px solid rgba(201,163,106,0.35)",
                    color: "var(--accent-warm)",
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--shadow-border)",
                    color: "var(--shadow-text-faint)",
                  }
            }
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function CreateGoalModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [clarity, setClarity] = useState<Level | null>(null);
  const [energy, setEnergy] = useState<Level | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!open) return null;

  const isValid = title.trim().length > 0;

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleAiAssist() {
    if (!title.trim()) return;
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const prompt = [
        `Analyse this goal and reply ONLY with a JSON object (no markdown, no explanation):`,
        `Goal: "${title.trim()}"`,
        why.trim() ? `Why: ${why.trim()}` : "",
        ``,
        `JSON schema:`,
        `{`,
        `  "refinedTitle": "clearer version of the goal title (string)",`,
        `  "suggestedAreas": ["up to 3 from: health, sleep, energy, money, career, learning, creativity, relationships, discipline, emotions, home, meaning"],`,
        `  "firstMission": "first concrete milestone to reach (string)",`,
        `  "firstTask": "single physical action to start today (string)"`,
        `}`,
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/shadow/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
      });
      const d = await res.json() as { reply?: string; error?: string };
      if (!res.ok || !d.reply) throw new Error(d.error ?? "No response.");
      setAiSuggestions(parseAiSuggestions(d.reply, title.trim()));
    } catch {
      // fallback: show empty suggestions panel so user isn't blocked
      setAiSuggestions({ refinedTitle: title.trim(), suggestedAreas: [], firstMission: "", firstTask: "" });
    } finally {
      setAiLoading(false);
    }
  }

  function applyAreaSuggestion(area: string) {
    if (!selectedAreas.includes(area)) {
      setSelectedAreas((prev) => [...prev, area]);
    }
  }

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setError(null);

    const clarityScore = clarity ? LEVELS.find((l) => l.value === clarity)?.score : undefined;
    const energyScore = energy ? LEVELS.find((l) => l.value === energy)?.score : undefined;

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          why: why.trim() || undefined,
          description: description.trim() || undefined,
          deadline: deadline || undefined,
          goal_type: goalType ?? undefined,
          linked_life_areas: selectedAreas,
          clarity_score: clarityScore,
          energy_score: energyScore,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError((body as { error?: string }).error ?? "Failed to create.");
        return;
      }

      const data = await res.json() as { goal: Goal };
      onCreated(data.goal);
      // Reset
      setTitle(""); setWhy(""); setDescription(""); setDeadline("");
      setGoalType(null); setSelectedAreas([]); setClarity(null); setEnergy(null);
      setAiSuggestions(null); setShowAdvanced(false);
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="anim-backdrop fixed inset-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(6,5,14,0.72)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create goal"
        className="anim-scale-in fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl max-h-[92vh] overflow-y-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:inset-x-auto scrollbar-hide"
        style={{
          background: "rgba(9, 8, 16, 0.98)",
          border: "1px solid var(--shadow-border)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 60px rgba(201,163,106,0.05), 0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p
                className="text-[10px] font-mono uppercase tracking-widest mb-1"
                style={{ color: "var(--accent-warm)" }}
              >
                New direction vector
              </p>
              <h2
                className="text-[18px] font-semibold leading-tight"
                style={{ color: "var(--shadow-text)" }}
              >
                Create Goal
              </h2>
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                A goal is an outcome Shadow will track across your life map.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 rounded-md p-1.5 transition-colors hover:bg-white/5"
              style={{ color: "var(--shadow-text-muted)" }}
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <label className="block">
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Goal *
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you want to achieve?"
                autoFocus
                className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none placeholder:text-[var(--shadow-text-faint)]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${title.trim() ? "rgba(201,163,106,0.3)" : "var(--shadow-border)"}`,
                  color: "var(--shadow-text)",
                }}
              />
            </label>

            {/* Why */}
            <label className="block">
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Why it matters
              </span>
              <input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="The deeper reason behind this goal"
                className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none placeholder:text-[var(--shadow-text-faint)]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--shadow-border)",
                  color: "var(--shadow-text)",
                }}
              />
            </label>

            {/* Goal Type */}
            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Goal Type
              </span>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setGoalType(goalType === t.value ? null : t.value)}
                    title={t.hint}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all"
                    style={
                      goalType === t.value
                        ? {
                            background: "rgba(109,123,255,0.15)",
                            border: "1px solid rgba(109,123,255,0.4)",
                            color: "var(--accent-cool)",
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--shadow-border)",
                            color: "var(--shadow-text-faint)",
                          }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {goalType && (
                <p className="text-[10px] mt-1" style={{ color: "var(--shadow-text-faint)" }}>
                  {GOAL_TYPES.find((t) => t.value === goalType)?.hint}
                </p>
              )}
            </div>

            {/* Linked Life Areas */}
            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Linked Life Areas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {LIFE_AREAS.map((area) => {
                  const active = selectedAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono capitalize transition-all"
                      style={
                        active
                          ? {
                              background: "rgba(201,163,106,0.12)",
                              border: "1px solid rgba(201,163,106,0.35)",
                              color: "var(--accent-warm)",
                            }
                          : {
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid var(--shadow-border)",
                              color: "var(--shadow-text-faint)",
                            }
                      }
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clarity + Energy */}
            <div className="grid grid-cols-2 gap-3">
              <LevelPicker label="Initial Clarity" value={clarity} onChange={setClarity} />
              <LevelPicker label="Initial Energy" value={energy} onChange={setEnergy} />
            </div>

            {/* AI Assist */}
            {title.trim() && (
              <div
                className="rounded-xl p-3"
                style={{ background: "rgba(126,87,194,0.06)", border: "1px solid rgba(126,87,194,0.15)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(126,87,194,0.8)" }}>
                    Shadow Assist
                  </span>
                  {!aiSuggestions && (
                    <button
                      type="button"
                      onClick={handleAiAssist}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(126,87,194,0.12)",
                        border: "1px solid rgba(126,87,194,0.25)",
                        color: "rgba(170,140,230,0.9)",
                      }}
                    >
                      <Sparkles size={10} />
                      {aiLoading ? "Analysing…" : "Refine this goal"}
                    </button>
                  )}
                </div>
                {aiLoading && (
                  <div className="flex gap-1 py-1" role="status" aria-live="polite" aria-label="Shadow is analysing your goal">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full animate-pulse"
                        style={{ background: "rgba(126,87,194,0.6)", animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
                {aiSuggestions && (
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span style={{ color: "var(--shadow-text-faint)" }}>Suggested areas: </span>
                      <span className="flex flex-wrap gap-1 mt-0.5">
                        {aiSuggestions.suggestedAreas.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => applyAreaSuggestion(a)}
                            className="px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-all"
                            style={{
                              background: selectedAreas.includes(a) ? "rgba(201,163,106,0.12)" : "rgba(126,87,194,0.1)",
                              border: `1px solid ${selectedAreas.includes(a) ? "rgba(201,163,106,0.3)" : "rgba(126,87,194,0.2)"}`,
                              color: selectedAreas.includes(a) ? "var(--accent-warm)" : "rgba(170,140,230,0.8)",
                            }}
                          >
                            {a}
                          </button>
                        ))}
                      </span>
                    </div>
                    {aiSuggestions.firstMission && (
                      <div>
                        <span style={{ color: "var(--shadow-text-faint)" }}>First mission: </span>
                        <span style={{ color: "var(--shadow-text-muted)" }}>{aiSuggestions.firstMission}</span>
                      </div>
                    )}
                    {aiSuggestions.firstTask && (
                      <div>
                        <span style={{ color: "var(--shadow-text-faint)" }}>First task: </span>
                        <span style={{ color: "var(--shadow-text-muted)" }}>{aiSuggestions.firstTask}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              <ChevronDown
                size={11}
                style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }}
              />
              {showAdvanced ? "Hide" : "More options"}
            </button>

            {showAdvanced && (
              <div className="space-y-3">
                {/* Notes */}
                <label className="block">
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                    style={{ color: "var(--shadow-text-muted)" }}
                  >
                    Notes
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Context, constraints, sub-goals…"
                    rows={3}
                    className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none resize-none placeholder:text-[var(--shadow-text-faint)]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--shadow-border)",
                      color: "var(--shadow-text)",
                    }}
                  />
                </label>

                {/* Deadline */}
                <label className="block">
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                    style={{ color: "var(--shadow-text-muted)" }}
                  >
                    Deadline
                  </span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--shadow-border)",
                      color: deadline ? "var(--shadow-text)" : "var(--shadow-text-faint)",
                      colorScheme: "dark",
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] mt-3" style={{ color: "var(--shadow-red)" }}>
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleCreate}
            disabled={!isValid || saving}
            className="mt-5 w-full py-3.5 rounded-xl text-[13px] font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: isValid ? "rgba(201,163,106,0.10)" : "rgba(255,255,255,0.02)",
              border: isValid ? "1px solid rgba(201,163,106,0.35)" : "1px solid transparent",
              color: isValid ? "var(--accent-warm)" : "var(--shadow-text-faint)",
              opacity: saving ? 0.5 : 1,
              boxShadow: isValid ? "0 0 20px rgba(201,163,106,0.06)" : "none",
            }}
          >
            {saving ? "Setting direction…" : (<><Plus size={13} /> Set Direction</>)}
          </button>
        </div>
      </div>
    </>
  );
}
