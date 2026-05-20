"use client";

import { useState } from "react";

// Placeholder Shadow AI reading. Heuristics only — real generation will replace.

export type ShadowReadingContext = {
  kind: "goal" | "mission" | "task";
  title: string;
  description?: string | null;
  goalType?: string | null;
  status?: string;
  linkedLifeAreas?: string[];
};

export function ShadowReading({ ctx }: { ctx: ShadowReadingContext }) {
  const [refresh, setRefresh] = useState(0);
  const r = derive(ctx, refresh);

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "rgba(126,87,194,0.05)",
        border: "1px solid rgba(126,87,194,0.14)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.24em]"
          style={{ color: "rgba(155,135,210,0.85)" }}
        >
          Shadow Reading
        </p>
        <button
          type="button"
          onClick={() => setRefresh((x) => x + 1)}
          className="text-[10px] font-mono transition-all hover:opacity-80"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          ↻ Refine
        </button>
      </div>

      <p className="text-[12.5px] leading-relaxed italic" style={{ color: "var(--shadow-text-muted)" }}>
        {r.interpretation}
      </p>

      <div className="space-y-1.5 text-[11.5px]" style={{ color: "var(--shadow-text-muted)" }}>
        <Line label="Next move" value={r.nextMove} />
        <Line label="Possible blocker" value={r.blocker} />
        {r.suggestedAreas.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span
              className="text-[9px] uppercase tracking-wider font-mono shrink-0"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Suggested areas
            </span>
            <span className="text-[11px] capitalize">{r.suggestedAreas.join(" · ")}</span>
          </div>
        )}
        {r.firstTask && (
          <Line label="First task" value={r.firstTask} />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <SmallBtn label="Generate Plan" />
        <SmallBtn label="Find Blocker" />
        <SmallBtn label="Create First Task" />
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[9px] uppercase tracking-wider font-mono shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {label}
      </span>
      <span className="text-[11px]">{value}</span>
    </div>
  );
}

function SmallBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="px-2.5 py-1 rounded-md text-[10px] font-mono transition-all"
      style={{
        background: "rgba(126,87,194,0.06)",
        border: "1px solid rgba(126,87,194,0.18)",
        color: "rgba(180,165,230,0.9)",
      }}
    >
      {label}
    </button>
  );
}

// Placeholder heuristic reading. Will be replaced with LLM call later.
function derive(ctx: ShadowReadingContext, salt: number) {
  const title = (ctx.title || "").toLowerCase();
  const text = `${title} ${(ctx.description ?? "").toLowerCase()}`;

  const detect = (kw: string[]) => kw.some((k) => text.includes(k));
  const areas: string[] = [];
  if (detect(["smoke", "drink", "sugar", "stop", "quit", "porn", "scroll"])) {
    areas.push("health", "discipline", "energy");
  }
  if (detect(["sleep", "energy", "tired"])) areas.push("energy", "health");
  if (detect(["work", "ship", "launch", "build", "project"])) areas.push("work", "creativity");
  if (detect(["money", "income", "save", "budget"])) areas.push("money");
  if (detect(["read", "learn", "study", "skill"])) areas.push("mind", "creativity");
  if (detect(["friend", "talk", "social"])) areas.push("social", "emotion");
  if (areas.length === 0) areas.push("meaning");

  let interpretation = "Direction still forming. Shape it with a clearer outcome and one anchor area.";
  if (ctx.goalType === "recovery") {
    interpretation = "This reads as a Recovery goal — connected to Health, Energy and Discipline.";
  } else if (ctx.goalType === "identity") {
    interpretation = "An Identity goal. Progress comes from repeated small acts that confirm who you become.";
  } else if (ctx.goalType === "outcome") {
    interpretation = "Outcome goal. Define the visible end state, then reverse-engineer a single first move.";
  } else if (ctx.goalType === "project") {
    interpretation = "Project goal. Risk = scope creep. Lock the minimum viable milestone.";
  }

  const nextMoves = [
    "Track the strongest trigger today.",
    "Write one paragraph clarifying why this matters.",
    "Define the smallest visible win for this week.",
    "Pick the single most important task and schedule it.",
  ];
  const blockers = [
    "Unclear next physical action.",
    "Outcome described but motivation not anchored.",
    "Too broad — needs a single observable target.",
    "No defined energy window for execution.",
  ];
  const firstTasks: Record<string, string> = {
    recovery: "Write down 3 moments when the urge came up.",
    identity: "Do one 10-minute act that fits the identity.",
    outcome:  "Sketch the end state in two sentences.",
    project:  "List 3 sub-deliverables, pick the smallest.",
    skill:    "Schedule 25 min of focused practice today.",
    experiment: "Define the hypothesis and the success signal.",
  };

  const idx = (salt + title.length) % nextMoves.length;
  const firstTask =
    ctx.kind === "goal" ? firstTasks[ctx.goalType ?? ""] ?? "Capture one specific next action." : undefined;

  return {
    interpretation,
    nextMove: nextMoves[idx],
    blocker: blockers[idx],
    suggestedAreas: Array.from(new Set(areas)).slice(0, 4),
    firstTask,
  };
}
