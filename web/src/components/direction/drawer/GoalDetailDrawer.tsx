"use client";

// Adapter for DirectionView's expected prop shape (`onUpdated`, `onDeleted`).
// Forwards to the flat drawer implementation in ../GoalDetailDrawer.tsx.

import type { Goal } from "@/types/db";
import { GoalDetailDrawer as Inner } from "../GoalDetailDrawer";

export function GoalDetailDrawer({
  goal, open, onClose, onUpdated, onDeleted,
}: {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (g: Goal) => void;
  onDeleted?: (id: string) => void;
}) {
  // onDeleted reserved for a future delete affordance.
  void onDeleted;
  return (
    <Inner
      goal={goal}
      open={open}
      onClose={onClose}
      onChanged={onUpdated}
    />
  );
}
