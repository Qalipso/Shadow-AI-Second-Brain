"use client";

import dynamic from "next/dynamic";
import type { Question } from "@/types/db";

const DailyCheckIn = dynamic(
  () => import("./DailyCheckIn").then((m) => ({ default: m.DailyCheckIn })),
  { ssr: false },
);
const EveningRitual = dynamic(
  () => import("@/components/reflection/EveningRitual").then((m) => ({ default: m.EveningRitual })),
  { ssr: false },
);

export function DashboardModals({ questions }: { questions: Question[] }) {
  return (
    <>
      <DailyCheckIn questions={questions} />
      <EveningRitual />
    </>
  );
}
