import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { getHabits, getHabitLogs, getTodayHabitLogs } from "@/lib/data";
import { RitualsView } from "@/components/rituals/RitualsView";
import { getWeekDates, isScheduledToday, toDateStr } from "@/lib/protocols/schedule";

export const dynamic = "force-dynamic";

export default async function RitualsPage() {
  const user = await getCurrentUser();

  const weekDates = getWeekDates(new Date());
  const weekStart = toDateStr(weekDates[0]);
  const weekEnd = toDateStr(weekDates[6]);

  const [habits, todayLogs, weekLogs] = await Promise.all([
    user ? getHabits(user.id) : Promise.resolve([]),
    user ? getTodayHabitLogs(user.id) : Promise.resolve([]),
    user ? getHabitLogs(user.id, weekStart, weekEnd) : Promise.resolve([]),
  ]);

  const active = habits.filter((h) => h.is_active);
  const scheduledToday = active.filter((h) => isScheduledToday(h.schedule));
  const completedToday = todayLogs.filter(
    (l) => l.status === "done" || l.status === "partial" || l.status === "recovered",
  );
  const rhythm = scheduledToday.length
    ? Math.round((completedToday.length / scheduledToday.length) * 100)
    : 0;

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Ritual System"
        title="Rituals"
        subtitle="Repeatable actions that shape your state, rhythm and memory."
        right={
          <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
            {scheduledToday.length} active · {completedToday.length} completed today · rhythm {rhythm}%
          </span>
        }
      />

      <div className="glow-line" />

      <RitualsView
        initialHabits={habits}
        initialLogs={todayLogs}
        weekLogs={weekLogs}
      />
    </div>
  );
}
