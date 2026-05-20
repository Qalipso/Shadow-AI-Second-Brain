"use client";
import { useInterventionState } from "./stateStore";
import {
  type EnergyLevel,
  type MoodTag,
  type FrictionTag,
  ENERGY_LABEL,
  MOOD_LABEL,
  FRICTION_LABEL,
} from "./types";
import { cn } from "@/lib/cn";

const ENERGIES: EnergyLevel[] = ["low", "medium", "high"];
const MOODS: MoodTag[] = ["stuck", "tired", "chaotic", "restless", "bored", "overstimulated"];
const FRICTIONS: FrictionTag[] = ["cant_start", "cant_choose", "bored", "need_switch", "need_reset"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs tracking-wide transition-all",
        "border bg-[rgba(20,20,30,0.5)] backdrop-blur-sm",
        active
          ? "border-[var(--shadow-border-active)] text-[var(--shadow-text)] shadow-[0_0_20px_rgba(214,184,116,0.18)]"
          : "border-[var(--shadow-border)] text-[var(--shadow-text-muted)] hover:text-[var(--shadow-text)] hover:border-[rgba(180,170,220,0.18)]",
      )}
    >
      {children}
    </button>
  );
}

export function StateInputPanel({ compact = false }: { compact?: boolean }) {
  const { state, hydrated, update, clear } = useInterventionState();
  if (!hydrated) {
    return (
      <div className="panel-ambient p-5 h-[160px] animate-pulse" />
    );
  }
  return (
    <div className="panel-ambient p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
            Current state
          </p>
          <p className="text-sm text-[var(--shadow-text-muted)] mt-1">
            Shadow tunes interventions to where you actually are.
          </p>
        </div>
        {(state.energy || state.mood || state.friction) && (
          <button
            type="button"
            onClick={clear}
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-text-muted)]"
          >
            Clear
          </button>
        )}
      </div>

      {!compact && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)]">
            Energy
          </p>
          <div className="flex flex-wrap gap-2">
            {ENERGIES.map((e) => (
              <Chip
                key={e}
                active={state.energy === e}
                onClick={() => update({ energy: state.energy === e ? undefined : e })}
              >
                {ENERGY_LABEL[e]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)]">
          Mood
        </p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip
              key={m}
              active={state.mood === m}
              onClick={() => update({ mood: state.mood === m ? undefined : m })}
            >
              {MOOD_LABEL[m]}
            </Chip>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)]">
            Friction
          </p>
          <div className="flex flex-wrap gap-2">
            {FRICTIONS.map((f) => (
              <Chip
                key={f}
                active={state.friction === f}
                onClick={() => update({ friction: state.friction === f ? undefined : f })}
              >
                {FRICTION_LABEL[f]}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
