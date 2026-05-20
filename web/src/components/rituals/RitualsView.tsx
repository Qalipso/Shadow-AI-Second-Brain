"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Habit, HabitLog } from "@/types/db";
import { isScheduledToday, todayStr } from "@/lib/protocols/schedule";
import { CreateProtocolModal } from "@/components/protocols/CreateProtocolModal";
import { RitualPulse } from "./RitualPulse";
import { RitualCard } from "./RitualCard";
import { RitualRhythm } from "./RitualRhythm";
import { NeedsReturn } from "./NeedsReturn";
import { RitualDetailDrawer } from "./RitualDetailDrawer";

interface Props {
  initialHabits: Habit[];
  initialLogs: HabitLog[];
  weekLogs: HabitLog[];
}

export function RitualsView({ initialHabits, initialLogs, weekLogs }: Props) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>(initialLogs);
  const [allWeekLogs, setAllWeekLogs] = useState<HabitLog[]>(weekLogs);
  const [createOpen, setCreateOpen] = useState(false);
  const [open, setOpen] = useState<Habit | null>(null);

  function handleCreated(h: Habit) {
    setHabits((prev) => [...prev, h]);
  }
  function handleChanged(h: Habit) {
    setHabits((prev) => prev.map((x) => x.id === h.id ? h : x));
    setOpen((cur) => cur && cur.id === h.id ? h : cur);
  }

  async function logStatus(habit: Habit, status: "done" | "skipped" | "partial") {
    try {
      const res = await fetch("/api/habit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_id: habit.id,
          log_date: todayStr(),
          status,
        }),
      });
      if (!res.ok) return;
      const { log } = await res.json() as { log: HabitLog };
      setTodayLogs((prev) => {
        const next = prev.filter((l) => l.habit_id !== habit.id);
        return [...next, log];
      });
      setAllWeekLogs((prev) => {
        const next = prev.filter((l) => !(l.habit_id === habit.id && l.log_date === log.log_date));
        return [...next, log];
      });
    } catch {
      /* keep silent */
    }
  }

  const logMap = new Map(todayLogs.map((l) => [l.habit_id, l]));
  const scheduled = habits.filter((h) => h.is_active && isScheduledToday(h.schedule));

  return (
    <>
      <div className="space-y-8 anim-fade-in">
        <RitualPulse habits={habits} todayLogs={todayLogs} />

        {/* Today's Rituals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-[10px] font-mono uppercase tracking-[0.28em]"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Today
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
              style={{
                background: "rgba(201,163,106,0.10)",
                border: "1px solid rgba(201,163,106,0.28)",
                color: "var(--accent-warm)",
              }}
            >
              <Plus size={12} />
              New Ritual
            </button>
          </div>

          {scheduled.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-10 text-center"
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid var(--shadow-border)",
              }}
            >
              <p className="text-[13px]" style={{ color: "var(--shadow-text-muted)" }}>
                No rituals scheduled today.
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--shadow-text-faint)" }}>
                Define one small repeatable action and let Shadow read the pattern.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {scheduled.map((h) => (
                <RitualCard
                  key={h.id}
                  habit={h}
                  todayLog={logMap.get(h.id) ?? null}
                  onOpen={() => setOpen(h)}
                  onStart={() => void logStatus(h, "done")}
                  onSkip={() => void logStatus(h, "skipped")}
                />
              ))}
            </div>
          )}
        </section>

        <div className="glow-line" />

        <RitualRhythm habits={habits} weekLogs={allWeekLogs} />

        <NeedsReturn
          habits={habits}
          onReturn={(h) => void logStatus(h, "partial")}
          onOpen={(h) => setOpen(h)}
        />
      </div>

      <CreateProtocolModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <RitualDetailDrawer
        habit={open}
        weekLogs={allWeekLogs}
        open={!!open}
        onClose={() => setOpen(null)}
        onChanged={handleChanged}
      />
    </>
  );
}
