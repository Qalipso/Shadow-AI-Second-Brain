"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { motion } from "motion/react";
import { CheckInWizard, type PendingQuestion } from "./CheckInWizard";
import { ElectricSparks, useShadowReducedMotion } from "@/components/fx";

type TodayCheckin = {
  id: string;
  date: string;
  energy: number | null;
  mood: number | null;
  mental_noise: number | null;
  body_state: number | null;
  focus: number | null;
  today_focus: string | null;
  today_focus_custom: string | null;
  insight_text: string | null;
  created_at: string;
};

type Props = {
  pendingQuestion: PendingQuestion | null;
  initialCheckins: TodayCheckin[];
};

export function CheckInPageClient({ pendingQuestion, initialCheckins }: Props) {
  const [open, setOpen] = useState(false);
  const [checkins, setCheckins] = useState<TodayCheckin[]>(initialCheckins);

  function handleClose() {
    setOpen(false);
    fetch("/api/checkin/today")
      .then((r) => r.json())
      .then((d: { checkins?: TodayCheckin[] }) => {
        if (d.checkins) setCheckins(d.checkins);
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-6">
      <BeginCard onBegin={() => setOpen(true)} hasHistory={checkins.length > 0} />

      {checkins.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Today&apos;s syncs · {checkins.length}
          </p>
          <div className="space-y-3">
            {checkins.map((c, idx) => (
              <CheckInCard key={c.id} checkin={c} index={checkins.length - idx} />
            ))}
          </div>
        </section>
      )}

      {open ? (
        <CheckInWizard
          onClose={handleClose}
          pendingQuestion={pendingQuestion}
        />
      ) : null}
    </div>
  );
}

function BeginCard({ onBegin, hasHistory }: { onBegin: () => void; hasHistory: boolean }) {
  const reduced = useShadowReducedMotion();
  return (
    <div className="relative rounded-xl border border-zinc-800 bg-[rgba(20,20,27,0.8)] backdrop-blur-sm p-8 flex flex-col items-center text-center gap-5 overflow-hidden">
      {/* Electric sparks ambient background */}
      <ElectricSparks density={2.2} color="214 184 116" branchChance={0.5} maxLength={70} />

      {/* Lightning bolt — staccato flash like real lightning, not smooth breathing */}
      <motion.div
        className="relative w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center"
        animate={
          reduced
            ? undefined
            : {
                boxShadow: [
                  "0 0 0px rgba(214,184,116,0)",
                  "0 0 28px rgba(214,184,116,0.7)",
                  "0 0 4px rgba(214,184,116,0.15)",
                  "0 0 22px rgba(214,184,116,0.55)",
                  "0 0 0px rgba(214,184,116,0)",
                  "0 0 0px rgba(214,184,116,0)",
                  "0 0 0px rgba(214,184,116,0)",
                  "0 0 0px rgba(214,184,116,0)",
                ],
              }
        }
        transition={{
          duration: 3.8,
          ease: "linear",
          times: [0, 0.03, 0.06, 0.10, 0.14, 0.35, 0.7, 1],
          repeat: Infinity,
          repeatDelay: 0.4,
        }}
      >
        <motion.div
          animate={
            reduced
              ? undefined
              : {
                  opacity: [0.55, 1, 0.7, 1, 0.55, 0.55, 0.55, 0.55],
                  scale:   [1,    1.18, 1, 1.12, 1,    1,    1,    1],
                  rotate:  [0,    -6,   3, -4,   0,    0,    0,    0],
                }
          }
          transition={{
            duration: 3.8,
            ease: "linear",
            times: [0, 0.03, 0.06, 0.10, 0.14, 0.35, 0.7, 1],
            repeat: Infinity,
            repeatDelay: 0.4,
          }}
        >
          <Zap size={20} className="text-[var(--accent-warm)]" />
        </motion.div>
      </motion.div>
      <div className="relative">
        <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-zinc-100 mb-1">
          {hasHistory ? "Add another sync" : "Start your daily sync"}
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm">
          {hasHistory
            ? "Each sync is a snapshot. Add one whenever your state shifts."
            : "Seven quick steps. No pressure. Just honest traces that help Shadow understand your day."}
        </p>
      </div>
      <motion.button
        type="button"
        onClick={onBegin}
        className="relative rounded-md bg-[var(--accent-warm)] text-black px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        animate={
          reduced
            ? undefined
            : {
                x: [0, -0.4, 0.5, -0.3, 0.4, 0],
              }
        }
        transition={{ duration: 0.22, ease: "linear", repeat: Infinity, repeatDelay: 3.6 }}
        whileHover={reduced ? undefined : { scale: 1.025 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
      >
        {hasHistory ? "New Check-in" : "Begin Daily Check-in"}
      </motion.button>
    </div>
  );
}

function CheckInCard({ checkin, index }: { checkin: TodayCheckin; index: number }) {
  const metrics: { label: string; value: number | null }[] = [
    { label: "Energy", value: checkin.energy },
    { label: "Mood", value: checkin.mood },
    { label: "Focus", value: checkin.focus },
    { label: "Body", value: checkin.body_state },
    { label: "Noise", value: checkin.mental_noise },
  ];

  const completedAt = new Date(checkin.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-[rgba(20,20,27,0.8)] backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            Sync #{index}
          </p>
          <p className="text-sm text-zinc-400 mt-0.5">{completedAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-2 text-center"
          >
            <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">{m.label}</p>
            <p className="font-[family-name:var(--font-fraunces)] text-lg text-[var(--accent-warm)]">
              {m.value !== null ? m.value : "—"}
            </p>
          </div>
        ))}
      </div>

      {checkin.today_focus ? (
        <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-3">
          <span className="text-zinc-600 uppercase tracking-wider text-[9px]">Focus · </span>
          {checkin.today_focus === "Something else" && checkin.today_focus_custom
            ? checkin.today_focus_custom
            : checkin.today_focus}
        </p>
      ) : null}

      {checkin.insight_text ? (
        <p className="text-xs text-zinc-400 italic border-t border-zinc-800 pt-3">
          <span className="text-zinc-600 uppercase tracking-wider text-[9px] not-italic">Insight · </span>
          &ldquo;{checkin.insight_text}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
