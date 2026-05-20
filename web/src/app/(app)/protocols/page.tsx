import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { getHabits, getHabitLogs, getTodayHabitLogs } from "@/lib/data";
import { ProtocolsView } from "@/components/protocols/ProtocolsView";
import { getWeekDates, toDateStr } from "@/lib/protocols/schedule";

export const dynamic = "force-dynamic";

export default async function ProtocolsPage() {
  const user = await getCurrentUser();

  const weekDates = getWeekDates(new Date());
  const weekStart = toDateStr(weekDates[0]);
  const weekEnd = toDateStr(weekDates[6]);

  const [habits, todayLogs, weekLogs] = await Promise.all([
    user ? getHabits(user.id) : Promise.resolve([]),
    user ? getTodayHabitLogs(user.id) : Promise.resolve([]),
    user ? getHabitLogs(user.id, weekStart, weekEnd) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow"
        title="Protocols"
        subtitle="Small rituals that leave traces in your second memory."
        right={
          <span className="text-[11px] text-zinc-500">
            {habits.filter((h) => h.is_active).length} active
          </span>
        }
      />

      <div className="glow-line" />

      <ProtocolsView
        initialHabits={habits}
        initialLogs={todayLogs}
        weekLogs={weekLogs}
      />
    </div>
  );
}
