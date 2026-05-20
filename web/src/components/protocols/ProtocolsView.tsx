"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Habit, HabitLog } from "@/types/db";
import { ProtocolsHeader } from "./ProtocolsHeader";
import { TodayProtocols } from "./TodayProtocols";
import { HabitGrid } from "./HabitGrid";
import { RecoveryQueue } from "./RecoveryQueue";
import { CreateProtocolModal } from "./CreateProtocolModal";

interface Props {
  initialHabits: Habit[];
  initialLogs: HabitLog[];
  weekLogs: HabitLog[];
}

export function ProtocolsView({
  initialHabits,
  initialLogs,
  weekLogs,
}: Props) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [createOpen, setCreateOpen] = useState(false);

  function handleCreated(habit: Habit) {
    setHabits((prev) => [...prev, habit]);
  }

  return (
    <>
      <div className="space-y-8 anim-fade-in">
        {/* Minimal system header */}
        <ProtocolsHeader habits={habits} todayLogs={initialLogs} />

        {/* Today rituals + create button */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium" style={{ color: "var(--shadow-text-muted)" }}>
              Today&apos;s Rituals
            </h2>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-mono transition-all"
              style={{
                background: "rgba(214, 184, 116, 0.08)",
                border: "1px solid var(--shadow-border-active)",
                color: "var(--shadow-gold)",
              }}
            >
              <Plus size={12} />
              New Ritual
            </button>
          </div>

          <TodayProtocols habits={habits} initialLogs={initialLogs} />
        </div>

        {/* Glow divider */}
        <div className="glow-line" />

        {/* Rhythm Map */}
        <div>
          <h2 className="text-[13px] font-medium mb-4" style={{ color: "var(--shadow-text-muted)" }}>
            Rhythm Map
          </h2>
          <HabitGrid habits={habits} initialLogs={weekLogs} />
        </div>

        {/* Return Threads */}
        <RecoveryQueue habits={habits} />
      </div>

      <CreateProtocolModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
