"use client";

import type { Goal, Mission, Task } from "@/types/db";
import { TaskDetailDrawer as Inner } from "../TaskDetailDrawer";

export function TaskDetailDrawer({
  task, goals, missions, open, onClose, onUpdated,
}: {
  task: Task | null;
  goals: Goal[];
  missions: Mission[];
  open: boolean;
  onClose: () => void;
  onUpdated?: (t: Task) => void;
}) {
  return (
    <Inner
      task={task}
      goals={goals}
      missions={missions}
      open={open}
      onClose={onClose}
      onChanged={onUpdated}
    />
  );
}
