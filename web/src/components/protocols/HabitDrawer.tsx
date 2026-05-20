"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import type { Habit, HabitLog, HabitLogStatus } from "@/types/db";

const SKIP_REASONS = [
  "No energy",
  "Forgot",
  "No time",
  "Resistance",
  "Sick",
  "Travel",
  "Not important today",
  "Bad mood",
  "Other",
];

// Soul amounts shown as reward hint per status
const SOUL_AMOUNTS: Partial<Record<HabitLogStatus, number>> = {
  done: 3,
  partial: 1,
  recovered: 2,
};

const STATUS_OPTIONS: { value: HabitLogStatus; label: string; color: string }[] = [
  { value: "done",    label: "Done",    color: "var(--cell-done)" },
  { value: "partial", label: "Partial", color: "var(--cell-partial)" },
  { value: "skipped", label: "Skip",    color: "var(--cell-skipped)" },
  { value: "failed",  label: "Failed",  color: "var(--cell-failed)" },
];

interface Props {
  habit: Habit;
  log: HabitLog | null;
  open: boolean;
  onClose: () => void;
  onSaved: (log: HabitLog, points: number, soulsAwarded: number) => void;
  date?: string; // YYYY-MM-DD, defaults to today
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HabitDrawer({ habit, log, open, onClose, onSaved, date }: Props) {
  const [status, setStatus] = useState<HabitLogStatus>(log?.status ?? "done");
  const [note, setNote] = useState(log?.note ?? "");
  const [moodAfter, setMoodAfter] = useState<number>(log?.mood_after ?? 0);
  const [energyAfter, setEnergyAfter] = useState<number>(log?.energy_after ?? 0);
  const [reason, setReason] = useState(log?.reason_if_skipped ?? log?.reason_if_failed ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when habit changes or drawer opens
  useEffect(() => {
    if (open) {
      setStatus(log?.status ?? "done");
      setNote(log?.note ?? "");
      setMoodAfter(log?.mood_after ?? 0);
      setEnergyAfter(log?.energy_after ?? 0);
      setReason(log?.reason_if_skipped ?? log?.reason_if_failed ?? "");
      setError(null);
    }
  }, [open, log]);

  const logDate = date ?? todayStr();
  const needsReason = status === "skipped" || status === "failed";
  const soulPreview = SOUL_AMOUNTS[status];

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/habit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_id: habit.id,
          log_date: logDate,
          status,
          note: note.trim() || undefined,
          mood_after: moodAfter || undefined,
          energy_after: energyAfter || undefined,
          reason_if_skipped: (status === "skipped" && reason) ? reason : undefined,
          reason_if_failed: (status === "failed" && reason) ? reason : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to save.");
        return;
      }

      const data = await res.json();
      onSaved(data.log, data.pointsAwarded ?? 0, data.soulsAwarded ?? 0);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="anim-backdrop fixed inset-0 z-40 backdrop-blur-sm"
        style={{ background: "rgba(6,5,14,0.62)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit protocol"
        className="anim-fade-up fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 z-50 rounded-t-2xl md:rounded-2xl"
        style={{
          background: "rgba(14, 13, 22, 0.97)",
          border: "1px solid var(--shadow-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.5), var(--shadow-glow-violet)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-8 h-1 rounded-full" style={{ background: "var(--shadow-border)" }} />
        </div>

        <div className="px-5 py-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p
                className="text-[10px] font-mono uppercase tracking-widest mb-1"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                Log Ritual
              </p>
              <h3 className="text-[15px] font-medium" style={{ color: "var(--shadow-text)" }}>
                {habit.name}
              </h3>
              {habit.minimum_version && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--shadow-text-faint)" }}>
                  Min: {habit.minimum_version}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Status */}
          <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--shadow-text-faint)" }}>
            Status
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {STATUS_OPTIONS.map((opt) => {
              const souls = SOUL_AMOUNTS[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className="py-2 rounded-lg text-[12px] font-mono transition-all duration-150 flex flex-col items-center gap-0.5"
                  style={{
                    background: status === opt.value ? `${opt.color}20` : "var(--bg-elev3)",
                    border: `1px solid ${status === opt.value ? opt.color : "transparent"}`,
                    color: status === opt.value ? opt.color : "var(--shadow-text-faint)",
                  }}
                >
                  <span>{opt.label}</span>
                  {souls !== undefined && (
                    <span
                      className="text-[9px] font-mono"
                      style={{
                        color: status === opt.value
                          ? "rgba(214,184,116,0.75)"
                          : "var(--shadow-text-faint)",
                        opacity: status === opt.value ? 1 : 0.6,
                      }}
                    >
                      +{souls}✦
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Soul reward hint */}
          {soulPreview !== undefined && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
              style={{
                background: "rgba(126,87,194,0.06)",
                border: "1px solid rgba(126,87,194,0.12)",
              }}
            >
              <span className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
                Soul reward:
              </span>
              <span className="text-[11px] font-mono" style={{ color: "rgba(214,184,116,0.85)" }}>
                +{soulPreview} soul{soulPreview > 1 ? "s" : ""} gathered
              </span>
            </div>
          )}

          {/* Note */}
          <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--shadow-text-faint)" }}>
            Note (optional)
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened?"
            rows={2}
            className="w-full text-[13px] rounded-lg px-3 py-2 resize-none mb-4 outline-none focus:ring-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text)",
            }}
          />

          {/* Reason (skipped/failed) */}
          {needsReason && (
            <>
              <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--shadow-text-faint)" }}>
                Reason
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {SKIP_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(reason === r ? "" : r)}
                    className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: reason === r ? "rgba(100, 116, 139, 0.3)" : "var(--bg-elev3)",
                      border: `1px solid ${reason === r ? "rgba(100,116,139,0.5)" : "var(--shadow-border)"}`,
                      color: reason === r ? "var(--shadow-text)" : "var(--shadow-text-muted)",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Mood + Energy */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {(["moodAfter", "energyAfter"] as const).map((field) => {
              const label = field === "moodAfter" ? "Mood after" : "Energy after";
              const val = field === "moodAfter" ? moodAfter : energyAfter;
              const set = field === "moodAfter" ? setMoodAfter : setEnergyAfter;

              return (
                <div key={field}>
                  <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--shadow-text-faint)" }}>
                    {label}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => set(val === n ? 0 : n)}
                        className="w-5 h-5 rounded text-[10px] font-mono transition-all"
                        style={{
                          background: val === n ? "rgba(126,87,194,0.5)" : "var(--bg-elev3)",
                          color: val === n ? "#e8e4f0" : "var(--shadow-text-faint)",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="text-[12px] mb-3" style={{ color: "var(--shadow-red)" }}>
              {error}
            </p>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="ritual-cta w-full py-3 rounded-xl text-[13px] font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            style={{
              background: saving ? "var(--bg-elev3)" : "rgba(214, 184, 116, 0.08)",
              border: "1px solid var(--shadow-border-active)",
              color: saving ? "var(--shadow-text-faint)" : "var(--shadow-gold)",
            }}
          >
            {saving ? "Saving…" : (
              <>
                Confirm Trace <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
