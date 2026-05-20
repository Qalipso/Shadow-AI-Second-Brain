import "server-only";
import { unstable_cache } from "next/cache";
import {
  DailyReportSchema,
  DailyWheelScoreSchema,
  EntrySchema,
  HabitLogSchema,
  HabitSchema,
  LifeAreaSchema,
  LifeAreaScoreSchema,
  QuestionSchema,
  type DailyReport,
  type DailyWheelScore,
  type Entry,
  type Habit,
  type HabitLog,
  type LifeArea,
  type LifeAreaScore,
  type Question,
} from "@/types/db";
import { hasSupabase } from "./supabase/env";
import { createSupabaseServerClient } from "./supabase/server";
import { FALLBACK_LIFE_AREAS, FALLBACK_QUESTIONS } from "./seed-fallback";

// All fetchers are env-aware:
// - With Supabase env set → real DB, Zod-validated at boundary.
// - Without env (dev) → deterministic seed-fallback so UI still renders.

// ─── Life Areas ────────────────────────────────────────────────────────────
// life_areas table is static — changes only on schema migrations.
// Cache for 1 hour to avoid hitting Supabase on every dashboard render.
export const getLifeAreas = unstable_cache(
  async (): Promise<LifeArea[]> => {
    if (!hasSupabase()) return FALLBACK_LIFE_AREAS;

    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("life_areas")
        .select("id, slug, name, description, order_index, color_hint")
        .order("order_index", { ascending: true });

      if (error) {
        console.error("[data:getLifeAreas]", error.message);
        return FALLBACK_LIFE_AREAS;
      }

      const parsed = LifeAreaSchema.array().safeParse(data ?? []);
      if (!parsed.success) {
        console.error("[data:getLifeAreas] Zod parse failed", parsed.error.message);
        return FALLBACK_LIFE_AREAS;
      }
      return parsed.data;
    } catch (e) {
      console.error("[data:getLifeAreas] threw", (e as Error).message);
      return FALLBACK_LIFE_AREAS;
    }
  },
  ["life-areas"],
  { revalidate: 3600 },
);

// ─── Active Questions ──────────────────────────────────────────────────────
export async function getActiveQuestions(): Promise<Question[]> {
  if (!hasSupabase()) return FALLBACK_QUESTIONS;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("question_bank")
      .select(
        "id, text, category, type, time_of_day, emotional_depth, weight, is_active, is_state_question, state_key",
      )
      .eq("is_active", true);

    if (error) {
      console.error("[data:getActiveQuestions]", error.message);
      return FALLBACK_QUESTIONS;
    }

    const parsed = QuestionSchema.array().safeParse(data ?? []);
    if (!parsed.success) {
      console.error(
        "[data:getActiveQuestions] Zod parse failed",
        parsed.error.message,
      );
      return FALLBACK_QUESTIONS;
    }
    return parsed.data;
  } catch (e) {
    console.error("[data:getActiveQuestions] threw", (e as Error).message);
    return FALLBACK_QUESTIONS;
  }
}

// Re-export the pure picker for server callers.
export { pickDailyQuestions } from "./pick";

// ─── Today's Scores ──────────────────────────────────────────────────────────
export async function getTodayScores(userId: string): Promise<LifeAreaScore[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("life_area_scores")
      .select("id, user_id, life_area_id, score, confidence, computed_at, rationale, data_volume")
      .eq("user_id", userId)
      .gte("computed_at", todayStart.toISOString());

    if (error) {
      console.error("[data:getTodayScores]", error.message);
      return [];
    }
    const parsed = LifeAreaScoreSchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getTodayScores] threw", (e as Error).message);
    return [];
  }
}

// ─── Latest Scores (most recent per area, no date filter) ────────────────────
// Falls back to whatever was last computed — survives midnight gaps.
export async function getLatestScores(userId: string): Promise<LifeAreaScore[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("life_area_scores")
      .select("id, user_id, life_area_id, score, confidence, computed_at, rationale, data_volume")
      .eq("user_id", userId)
      .order("computed_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[data:getLatestScores]", error.message);
      return [];
    }

    // Dedupe: keep first (most recent) score per life_area_id
    const seen = new Set<number>();
    const deduped = (data ?? []).filter((row: { life_area_id: number }) => {
      if (seen.has(row.life_area_id)) return false;
      seen.add(row.life_area_id);
      return true;
    });

    const parsed = LifeAreaScoreSchema.array().safeParse(deduped);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getLatestScores] threw", (e as Error).message);
    return [];
  }
}

// ─── Yesterday's Scores (for trend arrows) ──────────────────────────────────
export async function getYesterdayScores(
  userId: string,
): Promise<LifeAreaScore[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("life_area_scores")
      .select("id, user_id, life_area_id, score, confidence, computed_at, rationale, data_volume")
      .eq("user_id", userId)
      .gte("computed_at", yesterdayStart.toISOString())
      .lte("computed_at", yesterdayEnd.toISOString());

    if (error) {
      console.error("[data:getYesterdayScores]", error.message);
      return [];
    }
    const parsed = LifeAreaScoreSchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getYesterdayScores] threw", (e as Error).message);
    return [];
  }
}

// ─── Entries by Area (via junction table) ────────────────────────────────────
export async function getEntriesByArea(
  areaSlug: string,
  userId: string,
  limit = 50,
): Promise<Entry[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();

    // Resolve slug → id first
    const { data: area } = await supabase
      .from("life_areas")
      .select("id")
      .eq("slug", areaSlug)
      .single<{ id: number }>();
    if (!area) return [];

    // Get entry IDs from junction table
    const { data: junctions, error: jErr } = await supabase
      .from("entry_life_areas")
      .select("entry_id")
      .eq("life_area_id", area.id);
    if (jErr || !junctions?.length) return [];

    const entryIds = junctions.map((j: { entry_id: string }) => j.entry_id);

    // Fetch entries by those IDs (RLS scopes to user)
    const { data, error } = await supabase
      .from("entries")
      .select(
        "id, user_id, raw_text, summary, entry_type, life_area_id, emotion_primary, emotion_intensity, status, created_at",
      )
      .eq("user_id", userId)
      .in("id", entryIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[data:getEntriesByArea]", error.message);
      return [];
    }
    const parsed = EntrySchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getEntriesByArea] threw", (e as Error).message);
    return [];
  }
}

// ─── Area Entry Counts ───────────────────────────────────────────────────────
export type AreaEntryCount = { total: number; today: number };

export async function getAreaEntryCounts(
  userId: string,
  days: number,
): Promise<Map<number, AreaEntryCount>> {
  const empty = new Map<number, AreaEntryCount>();
  if (!hasSupabase()) return empty;

  try {
    const supabase = await createSupabaseServerClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch junction rows for user's entries in date range
    const { data: entries, error: eErr } = await supabase
      .from("entries")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString());
    if (eErr || !entries?.length) return empty;

    const entryIds = entries.map((e: { id: string }) => e.id);
    const entryDates = new Map(
      entries.map((e: { id: string; created_at: string }) => [
        e.id,
        e.created_at,
      ]),
    );

    const { data: junctions, error: jErr } = await supabase
      .from("entry_life_areas")
      .select("entry_id, life_area_id")
      .in("entry_id", entryIds);
    if (jErr || !junctions?.length) return empty;

    const counts = new Map<number, AreaEntryCount>();
    for (const j of junctions) {
      const row = j as { entry_id: string; life_area_id: number };
      const prev = counts.get(row.life_area_id) ?? { total: 0, today: 0 };
      prev.total += 1;
      const ts = entryDates.get(row.entry_id);
      if (ts && new Date(ts) >= todayStart) {
        prev.today += 1;
      }
      counts.set(row.life_area_id, prev);
    }
    return counts;
  } catch (e) {
    console.error("[data:getAreaEntryCounts] threw", (e as Error).message);
    return empty;
  }
}

// ─── Daily Reports ───────────────────────────────────────────────────────────
export async function getRecentReports(
  userId: string,
  limit = 30,
): Promise<DailyReport[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("daily_reports")
      .select("id, user_id, report_date, body, confidence, headline, created_at")
      .eq("user_id", userId)
      .order("report_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[data:getRecentReports]", error.message);
      return [];
    }
    const parsed = DailyReportSchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getRecentReports] threw", (e as Error).message);
    return [];
  }
}

// ─── Today's Wheel Score (user self-assessment) ───────────────────────────────
export async function getTodayWheelScore(
  userId: string,
): Promise<DailyWheelScore | null> {
  if (!hasSupabase()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("daily_wheel_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("scored_date", dateStr)
      .single();

    if (error || !data) return null;
    const parsed = DailyWheelScoreSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.error("[data:getTodayWheelScore] threw", (e as Error).message);
    return null;
  }
}

export async function getTodayReport(userId: string): Promise<DailyReport | null> {
  if (!hasSupabase()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("daily_reports")
      .select("id, user_id, report_date, body, confidence, headline, created_at")
      .eq("user_id", userId)
      .eq("report_date", dateStr)
      .single();

    if (error || !data) return null;
    const parsed = DailyReportSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (e) {
    console.error("[data:getTodayReport] threw", (e as Error).message);
    return null;
  }
}

// ─── Entries for user (timeline) ─────────────────────────────────────────────
export async function getUserEntries(
  userId: string,
  limit = 100,
  offset = 0,
): Promise<Entry[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("entries")
      .select(
        "id, user_id, raw_text, summary, entry_type, life_area_id, emotion_primary, emotion_intensity, status, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[data:getUserEntries]", error.message);
      return [];
    }
    const parsed = EntrySchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getUserEntries] threw", (e as Error).message);
    return [];
  }
}

// ─── Habits (LifeOS Protocols) ───────────────────────────────────────────────

export async function getHabits(userId: string): Promise<Habit[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[data:getHabits]", error.message);
      return [];
    }
    const parsed = HabitSchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getHabits] threw", (e as Error).message);
    return [];
  }
}

export async function getHabitLogs(
  userId: string,
  from: string,
  to: string,
): Promise<HabitLog[]> {
  if (!hasSupabase()) return [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", from)
      .lte("log_date", to)
      .order("log_date", { ascending: false });

    if (error) {
      console.error("[data:getHabitLogs]", error.message);
      return [];
    }
    const parsed = HabitLogSchema.array().safeParse(data ?? []);
    return parsed.success ? parsed.data : [];
  } catch (e) {
    console.error("[data:getHabitLogs] threw", (e as Error).message);
    return [];
  }
}

export async function getTodayHabitLogs(userId: string): Promise<HabitLog[]> {
  const today = toDateStr(new Date());
  return getHabitLogs(userId, today, today);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── User-scoped counts (Phase 2.2 onward) ─────────────────────────────────
export type DashboardCounts = {
  entriesToday: number;
  entriesTotal: number;
  tasksOpen: number;
  goalsActive: number;
};

// Returns zeros in dev mode (no Supabase) or when unauthenticated.
// Each query is RLS-scoped to the current user.
export async function getDashboardCounts(): Promise<DashboardCounts> {
  const empty: DashboardCounts = {
    entriesToday: 0,
    entriesTotal: 0,
    tasksOpen: 0,
    goalsActive: 0,
  };
  if (!hasSupabase()) return empty;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const isoToday = todayStart.toISOString();

    const [entriesTotalQ, entriesTodayQ, tasksOpenQ, goalsActiveQ] =
      await Promise.all([
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", isoToday),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "open"),
        supabase
          .from("goals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

    return {
      entriesTotal: entriesTotalQ.count ?? 0,
      entriesToday: entriesTodayQ.count ?? 0,
      tasksOpen: tasksOpenQ.count ?? 0,
      goalsActive: goalsActiveQ.count ?? 0,
    };
  } catch (e) {
    console.error("[data:getDashboardCounts] threw", (e as Error).message);
    return empty;
  }
}

// ─── Check-in Streak ──────────────────────────────────────────────────────────
// Returns consecutive daily check-in streak ending today (or yesterday).
export async function getCheckinStreak(userId: string): Promise<number> {
  if (!hasSupabase()) return 0;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("daily_checkins")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(60);

    if (error || !data || data.length === 0) return 0;

    const dates = [...new Set(data.map((r: { date: string }) => r.date))].sort(
      (a, b) => b.localeCompare(a),
    );

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Streak must start from today or yesterday.
    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  } catch (e) {
    console.error("[data:getCheckinStreak] threw", (e as Error).message);
    return 0;
  }
}
