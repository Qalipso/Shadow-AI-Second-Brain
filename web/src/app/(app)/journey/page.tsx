import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { getUserEntries, getLifeAreas, getCheckinStreak } from "@/lib/data";
import { EmptyState } from "@/components/EmptyState";
import type { Entry } from "@/types/db";

export const dynamic = "force-dynamic";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localDate(iso: string): string {
  // Extract YYYY-MM-DD in local time
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const todayKey = localDate(today.toISOString());
  const yesterdayKey = localDate(new Date(Date.now() - 86_400_000).toISOString());
  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// ─── Group entries by day ─────────────────────────────────────────────────────

type DayGroup = {
  dateKey: string;
  entries: Entry[];
  types: string[];
  emotions: string[];
};

function groupByDay(entries: Entry[]): DayGroup[] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = localDate(e.created_at);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 60) // last 60 days max
    .map(([dateKey, dayEntries]) => ({
      dateKey,
      entries: dayEntries,
      types: [...new Set(dayEntries.map((e) => e.entry_type).filter(Boolean) as string[])],
      emotions: [...new Set(dayEntries.map((e) => e.emotion_primary).filter(Boolean) as string[])],
    }));
}

// ─── Streak helpers ───────────────────────────────────────────────────────────

function buildStreakBars(days: DayGroup[], streak: number): { dateKey: string; active: boolean }[] {
  const todayKey = localDate(new Date().toISOString());
  const last30: { dateKey: string; active: boolean }[] = [];
  const activeSet = new Set(days.map((d) => d.dateKey));
  for (let i = 29; i >= 0; i--) {
    const key = localDate(new Date(Date.now() - i * 86_400_000).toISOString());
    last30.push({ dateKey: key, active: activeSet.has(key) });
  }
  return last30;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JourneyPage() {
  const user = await getCurrentUser();
  const [entries, areas, streak] = await Promise.all([
    user ? getUserEntries(user.id, 300) : Promise.resolve([]),
    getLifeAreas(),
    user ? getCheckinStreak(user.id) : Promise.resolve(0),
  ]);

  const areaNameById = new Map(areas.map((a) => [a.id, a]));
  const days = groupByDay(entries);
  const streakBars = buildStreakBars(days, streak);
  const totalDays = days.length;

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Journey"
        title="Journey"
        subtitle="Long-term patterns, traces and milestones."
        right={
          entries.length > 0 ? (
            <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
              {entries.length} traces · {totalDays} days
            </span>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          headline="No traces yet."
          sub="Every entry you capture becomes a trace in your journey."
          cta={{ label: "Drop one into Inbox", href: "/inbox" }}
        />
      ) : (
        <>
          {/* ── Streak heatmap ─────────────────────────────────────────── */}
          <div
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.018)",
              border: "1px solid var(--shadow-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Activity — last 30 days</p>
              <span
                className="text-[11px] font-mono"
                style={{ color: streak > 0 ? "var(--accent-warm)" : "var(--shadow-text-faint)" }}
              >
                {streak > 0 ? `${streak}-day streak` : "no active streak"}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap" aria-label="Activity heatmap">
              {streakBars.map(({ dateKey, active }) => (
                <div
                  key={dateKey}
                  title={dateKey}
                  className="h-4 w-4 rounded-sm"
                  style={{
                    background: active
                      ? "rgba(201,163,106,0.6)"
                      : "rgba(255,255,255,0.05)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Timeline ──────────────────────────────────────────────── */}
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div
              className="absolute left-[5px] top-2 bottom-2 w-px"
              style={{ background: "rgba(255,255,255,0.06)" }}
              aria-hidden
            />

            {days.map((day) => {
              const typeSet = day.types.slice(0, 4);
              const emotionSet = day.emotions.slice(0, 3);

              return (
                <div key={day.dateKey} className="relative pl-8 pb-6">
                  {/* Node dot */}
                  <div
                    className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border"
                    style={{
                      background: day.entries.length >= 3 ? "var(--accent-warm)" : "rgba(255,255,255,0.12)",
                      borderColor: day.entries.length >= 3 ? "rgba(201,163,106,0.4)" : "rgba(255,255,255,0.08)",
                      boxShadow: day.entries.length >= 3 ? "0 0 8px rgba(201,163,106,0.35)" : "none",
                    }}
                  />

                  {/* Day header */}
                  <div className="flex items-baseline gap-3 mb-2">
                    <span
                      className="text-[12px] font-mono"
                      style={{ color: "var(--shadow-text-muted)" }}
                    >
                      {formatDayLabel(day.dateKey)}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--shadow-text-faint)" }}
                    >
                      {day.entries.length} {day.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Entry chips */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                    {day.entries.slice(0, 5).map((e) => {
                      const area = e.life_area_id ? areaNameById.get(e.life_area_id) : null;
                      return (
                        <div key={e.id} className="flex items-baseline gap-1.5">
                          {area && (
                            <span
                              className="text-[9px] font-mono uppercase tracking-widest"
                              style={{ color: area.color_hint ?? "var(--accent-warm)" }}
                            >
                              {area.name}
                            </span>
                          )}
                          <span
                            className="text-[11px] leading-snug"
                            style={{ color: "var(--shadow-text-muted)" }}
                          >
                            {(e.summary ?? e.raw_text).slice(0, 60)}
                            {(e.summary ?? e.raw_text).length > 60 ? "…" : ""}
                          </span>
                        </div>
                      );
                    })}
                    {day.entries.length > 5 && (
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--shadow-text-faint)" }}
                      >
                        +{day.entries.length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Tags row */}
                  {(typeSet.length > 0 || emotionSet.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {typeSet.map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            color: "var(--shadow-text-faint)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                      {emotionSet.map((em) => (
                        <span
                          key={em}
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(201,163,106,0.06)",
                            border: "1px solid rgba(201,163,106,0.12)",
                            color: "rgba(201,163,106,0.7)",
                          }}
                        >
                          {em}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
