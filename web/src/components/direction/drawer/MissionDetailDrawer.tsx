"use client";

import type { Goal, Mission } from "@/types/db";
import { MissionDetailDrawer as Inner } from "../MissionDetailDrawer";

export function MissionDetailDrawer({
  mission, goals, open, onClose, onUpdated,
}: {
  mission: Mission | null;
  goals: Goal[];
  open: boolean;
  onClose: () => void;
  onUpdated?: (m: Mission) => void;
}) {
  return (
    <Inner
      mission={mission}
      goals={goals}
      open={open}
      onClose={onClose}
      onChanged={onUpdated}
    />
  );
}
