"use client";

import { useState } from "react";
import type { Habit, HabitLog } from "@/types/db";
import { isScheduledToday } from "@/lib/protocols/schedule";
import { ProtocolCard } from "./ProtocolCard";
import { HUDToast } from "./HUDToast";

interface ToastMsg {
  title: string;
  sphereImpact?: string[];
  streak?: number;
  strength?: number;
  points?: number;
  souls?: number;
  soulPhrase?: string;
}

interface Props {
  habits: Habit[];
  initialLogs: HabitLog[];
}

export function TodayProtocols({ habits, initialLogs }: Props) {
  const [logs, setLogs] = useState<Map<string, HabitLog>>(
    () => new Map(initialLogs.map((l) => [l.habit_id, l])),
  );
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const scheduledToday = habits.filter((h) => h.is_active && isScheduledToday(h.schedule));

  if (scheduledToday.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--shadow-border)", background: "var(--shadow-panel-soft)" }}
      >
        <p className="text-[13px]" style={{ color: "var(--shadow-text-faint)" }}>
          No rituals active yet.
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--shadow-text-faint)" }}>
          Create a small repeatable action and let Shadow start reading the pattern.
        </p>
      </div>
    );
  }

  function handleLogged(log: HabitLog, points: number, soulsAwarded: number) {
    setLogs((prev) => new Map(prev).set(log.habit_id, log));

    const habit = habits.find((h) => h.id === log.habit_id);
    if (!habit) return;

    const sphereImpact = habit.sphere_slugs.slice(0, 3).map((s) => `${s} +1`);

    if (log.status === "done" || log.status === "partial" || log.status === "recovered") {
      const soulPhrase =
        log.status === "recovered"
          ? "The thread returns."
          : soulsAwarded >= 3
            ? "The thread grows denser."
            : soulsAwarded > 0
              ? "A trace was left."
              : undefined;

      setToast({
        title: "TRACE CONFIRMED",
        sphereImpact,
        streak: habit.streak_current + 1,
        strength: habit.strength_score,
        points,
        souls: soulsAwarded > 0 ? soulsAwarded : undefined,
        soulPhrase,
      });
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {scheduledToday.map((habit) => (
          <ProtocolCard
            key={habit.id}
            habit={habit}
            log={logs.get(habit.id) ?? null}
            onLogged={handleLogged}
          />
        ))}
      </div>

      <HUDToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
