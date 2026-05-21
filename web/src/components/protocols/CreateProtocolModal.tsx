"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { Habit, HabitSchedule } from "@/types/db";

const SPHERES = [
  "work", "money", "health", "energy", "food",
  "mind", "creativity", "social", "emotion",
  "discipline", "environment", "meaning",
];

const SPHERE_COLORS: Record<string, string> = {
  work: "#C9A36A", money: "#6FBF8A", health: "#6DBFA5",
  energy: "#FFD166", food: "#A8D5BA", mind: "#A78BFA",
  creativity: "#F472B6", social: "#60A5FA", emotion: "#FB923C",
  discipline: "#94A3B8", environment: "#34D399", meaning: "#E879F9",
};

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (habit: Habit) => void;
}

function SectionDivider() {
  return (
    <div
      className="my-4"
      style={{ height: 1, background: "var(--shadow-border)" }}
    />
  );
}

export function CreateProtocolModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [type, setType] = useState<Habit["type"]>("binary");
  const [spheres, setSpheres] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<HabitSchedule["type"]>("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState(5);
  const [difficulty, setDifficulty] = useState<Habit["difficulty"]>("medium");
  const [minimumVersion, setMinimumVersion] = useState("");
  const [idealVersion, setIdealVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isValid =
    name.trim().length > 0 &&
    spheres.length > 0 &&
    (scheduleType !== "specific_days" || selectedDays.length > 0);

  function toggleSphere(slug: string) {
    setSpheres((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function buildSchedule(): HabitSchedule {
    if (scheduleType === "specific_days") {
      return { type: "specific_days", daysOfWeek: selectedDays as HabitSchedule["daysOfWeek"] };
    }
    if (scheduleType === "times_per_week") {
      return { type: "times_per_week", timesPerWeek };
    }
    return { type: scheduleType };
  }

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          sphere_slugs: spheres,
          schedule: buildSchedule(),
          difficulty,
          minimum_version: minimumVersion.trim() || undefined,
          ideal_version: idealVersion.trim() || undefined,
          why: why.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to create.");
        return;
      }

      const data = await res.json();
      onCreated(data.habit);
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
        className="anim-backdrop fixed inset-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(6,5,14,0.68)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="anim-scale-in fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl max-h-[90vh] overflow-y-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:inset-x-auto scrollbar-hide"
        style={{
          background: "rgba(11, 9, 18, 0.98)",
          border: "1px solid var(--shadow-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--shadow-glow-violet), 0 32px 80px rgba(0,0,0,0.75)",
        }}
      >
        <div className="p-5">

          {/* ── Header ────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p
                className="text-[10px] font-mono uppercase tracking-widest mb-0.5"
                style={{ color: "var(--shadow-violet)" }}
              >
                NEW RITUAL THREAD
              </p>
              <h2
                className="text-[17px] font-semibold leading-tight"
                style={{ color: "var(--shadow-text)" }}
              >
                Create Protocol
              </h2>
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Give Shadow a repeatable action to remember.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 rounded-md p-1 transition-colors hover:bg-[var(--bg-elev3)]"
              style={{ color: "var(--shadow-text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Identity ──────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="block">
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Name *
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Walk 30 min"
                className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none placeholder:text-[var(--shadow-text-faint)]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${name.trim() ? "rgba(180,170,220,0.22)" : "var(--shadow-border)"}`,
                  color: "var(--shadow-text)",
                }}
              />
            </label>

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
                placeholder="e.g. Stabilize energy and mood"
                className="w-full text-[13px] rounded-lg px-3 py-2.5 outline-none placeholder:text-[var(--shadow-text-faint)]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--shadow-border)",
                  color: "var(--shadow-text)",
                }}
              />
            </label>
          </div>

          <SectionDivider />

          {/* ── Spheres ───────────────────────────────────────── */}
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-widest block mb-2"
              style={{ color: "var(--shadow-text-muted)" }}
            >
              Spheres *
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SPHERES.map((slug) => {
                const active = spheres.includes(slug);
                const color = SPHERE_COLORS[slug];
                return (
                  <button
                    key={slug}
                    onClick={() => toggleSphere(slug)}
                    className="sphere-btn relative text-[11px] px-2.5 py-1 rounded-full font-mono capitalize"
                    style={{
                      background: active ? `${color}1a` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? `${color}60` : "var(--shadow-border)"}`,
                      color: active ? color : "var(--shadow-text-muted)",
                      boxShadow: active ? `0 0 12px ${color}22` : undefined,
                    }}
                  >
                    {active && (
                      <span
                        className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full"
                        style={{ background: color, opacity: 0.85 }}
                      />
                    )}
                    {slug}
                  </button>
                );
              })}
            </div>
          </div>

          <SectionDivider />

          {/* ── Rhythm ────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                  style={{ color: "var(--shadow-text-muted)" }}
                >
                  Type
                </span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Habit["type"])}
                  className="w-full text-[12px] rounded-lg px-2 py-1.5 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--shadow-border)",
                    color: "var(--shadow-text)",
                  }}
                >
                  <option value="binary">Binary</option>
                  <option value="measurable">Measurable</option>
                  <option value="timer">Timer</option>
                  <option value="avoidance">Avoidance</option>
                  <option value="ritual">Ritual</option>
                </select>
              </div>
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                  style={{ color: "var(--shadow-text-muted)" }}
                >
                  Difficulty
                </span>
                <div className="flex gap-1.5">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className="flex-1 text-[11px] py-1.5 rounded-lg font-mono capitalize transition-all"
                      style={{
                        background: difficulty === d ? "rgba(126,87,194,0.14)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${difficulty === d ? "rgba(126,87,194,0.42)" : "transparent"}`,
                        color: difficulty === d ? "var(--shadow-violet)" : "var(--shadow-text-muted)",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Frequency
              </span>
              <div className="flex gap-1.5 mb-2">
                {(["daily", "specific_days", "times_per_week"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setScheduleType(t)}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-mono transition-all"
                    style={{
                      background: scheduleType === t ? "rgba(126,87,194,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${scheduleType === t ? "rgba(126,87,194,0.38)" : "transparent"}`,
                      color: scheduleType === t ? "var(--shadow-violet)" : "var(--shadow-text-muted)",
                    }}
                  >
                    {t === "daily" ? "Daily" : t === "specific_days" ? "Specific days" : "X / week"}
                  </button>
                ))}
              </div>

              {scheduleType === "specific_days" && (
                <div className="flex gap-1.5">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className="w-8 h-8 rounded text-[11px] font-mono uppercase transition-all"
                      style={{
                        background: selectedDays.includes(day) ? "rgba(214,184,116,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${selectedDays.includes(day) ? "rgba(214,184,116,0.42)" : "var(--shadow-border)"}`,
                        color: selectedDays.includes(day) ? "var(--shadow-gold)" : "var(--shadow-text-muted)",
                      }}
                    >
                      {day[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {scheduleType === "times_per_week" && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={timesPerWeek}
                    onChange={(e) => setTimesPerWeek(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span
                    className="text-[13px] font-mono w-12 text-center"
                    style={{ color: "var(--shadow-text)" }}
                  >
                    {timesPerWeek}x/wk
                  </span>
                </div>
              )}
            </div>
          </div>

          <SectionDivider />

          {/* ── Versions ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Minimum version
              </span>
              <input
                value={minimumVersion}
                onChange={(e) => setMinimumVersion(e.target.value)}
                placeholder="e.g. 5 min"
                className="w-full text-[12px] rounded-lg px-2 py-1.5 outline-none placeholder:text-[var(--shadow-text-faint)]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--shadow-border)",
                  color: "var(--shadow-text)",
                }}
              />
              <p
                className="text-[10px] mt-1.5 leading-snug"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                Keeps the thread alive when energy is low.
              </p>
            </label>
            <label className="block">
              <span
                className="text-[10px] font-mono uppercase tracking-widest block mb-1.5"
                style={{ color: "var(--shadow-text-muted)" }}
              >
                Ideal version
              </span>
              <input
                value={idealVersion}
                onChange={(e) => setIdealVersion(e.target.value)}
                placeholder="e.g. 30 min"
                className="w-full text-[12px] rounded-lg px-2 py-1.5 outline-none placeholder:text-[var(--shadow-text-faint)]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--shadow-border)",
                  color: "var(--shadow-text)",
                }}
              />
              <p
                className="text-[10px] mt-1.5 leading-snug"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                The full ritual when conditions are good.
              </p>
            </label>
          </div>

          <SectionDivider />

          {/* ── Impact Memory preview ─────────────────────────── */}
          <div
            className="rounded-xl p-3.5 mb-4"
            style={{
              background: "rgba(126, 87, 194, 0.06)",
              border: "1px solid rgba(126, 87, 194, 0.14)",
            }}
          >
            <p
              className="text-[10px] font-mono uppercase tracking-widest mb-2"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Shadow will remember this through
            </p>

            {spheres.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {spheres.map((slug) => {
                    const color = SPHERE_COLORS[slug];
                    return (
                      <span
                        key={slug}
                        className="text-[11px] px-2 py-0.5 rounded-full font-mono capitalize"
                        style={{
                          background: `${color}18`,
                          border: `1px solid ${color}45`,
                          color: color,
                        }}
                      >
                        {slug}
                      </span>
                    );
                  })}
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--shadow-text-muted)" }}
                >
                  Starts as a forming ritual.
                </p>
                {minimumVersion && (
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--shadow-text-faint)" }}
                  >
                    Minimum version protects the thread on low-energy days.
                  </p>
                )}
              </>
            ) : (
              <p
                className="text-[11px]"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                Select spheres to show where this ritual will leave traces.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] mb-3" style={{ color: "var(--shadow-red)" }}>
              {error}
            </p>
          )}

          {/* ── CTA ───────────────────────────────────────────── */}
          <button
            onClick={handleCreate}
            disabled={!isValid || saving}
            className="ritual-cta w-full py-3.5 rounded-xl text-[13px] font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            style={{
              background: "rgba(214, 184, 116, 0.10)",
              border: "1px solid var(--shadow-border-active)",
              color: "var(--shadow-gold)",
            }}
          >
            {saving ? "Creating…" : (<><Plus size={14} /> Begin Ritual</>)}
          </button>
        </div>
      </div>
    </>
  );
}
