import type { HabitSchedule } from "@/types/db";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Returns YYYY-MM-DD for a given Date */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today as YYYY-MM-DD */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** Returns Mon–Sun dates for the week containing `date` */
export function getWeekDates(date: Date): Date[] {
  const day = date.getDay(); // 0 = Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Returns all dates in the month containing `date` */
export function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
}

/** True if a habit with `schedule` is due on `date` */
export function isScheduledOn(schedule: HabitSchedule, date: Date): boolean {
  const dayName = DAY_NAMES[date.getDay()];

  switch (schedule.type) {
    case "daily":
      return true;

    case "specific_days":
      return schedule.daysOfWeek?.includes(dayName) ?? false;

    case "weekly":
      // Due on any day — caller tracks "times completed this week"
      return true;

    case "times_per_week":
      // Due on any day — frequency enforcement handled separately
      return true;

    default:
      return true;
  }
}

/** True if a habit is due today */
export function isScheduledToday(schedule: HabitSchedule): boolean {
  return isScheduledOn(schedule, new Date());
}
