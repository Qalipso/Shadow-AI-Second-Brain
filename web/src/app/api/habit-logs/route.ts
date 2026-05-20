import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { HabitLogSchema, HabitLogStatusSchema } from "@/types/db";
import { calcHabitStrength, calcStreakAndRate, pointsForStatus } from "@/lib/protocols/strength";
import { awardSouls, getSoulCoreStatus } from "@/lib/souls/soulCore";

// Souls awarded per habit log status
const HABIT_SOUL_AMOUNTS: Partial<Record<string, number>> = {
  done: 3,
  partial: 1,
  recovered: 2,
};

const CreateHabitLogInput = z.object({
  habit_id: z.string().uuid(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: HabitLogStatusSchema,
  value: z.number().optional(),
  note: z.string().max(2000).optional(),
  mood_after: z.number().int().min(1).max(10).optional(),
  energy_after: z.number().int().min(1).max(10).optional(),
  reason_if_skipped: z.string().max(500).optional(),
  reason_if_failed: z.string().max(500).optional(),
});

// ─── GET /api/habit-logs?from=YYYY-MM-DD&to=YYYY-MM-DD ─────────────────────
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  if (!hasSupabase()) return NextResponse.json({ logs: [], mode: "local" });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let query = supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false });

  if (from) query = query.gte("log_date", from);
  if (to) query = query.lte("log_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = (data ?? [])
    .map((row: unknown) => HabitLogSchema.safeParse(row))
    .filter((p): p is { success: true; data: z.infer<typeof HabitLogSchema> } => p.success)
    .map((p) => p.data);

  return NextResponse.json({ logs, mode: "db" });
}

// ─── POST /api/habit-logs ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = CreateHabitLogInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!hasSupabase()) return NextResponse.json({ error: "No DB." }, { status: 503 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const points = pointsForStatus(parsed.data.status);

  // Upsert log (unique on habit_id + log_date)
  const { data: logRow, error: logErr } = await supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: parsed.data.habit_id,
        user_id: user.id,
        log_date: parsed.data.log_date,
        status: parsed.data.status,
        value: parsed.data.value ?? null,
        note: parsed.data.note ?? null,
        mood_after: parsed.data.mood_after ?? null,
        energy_after: parsed.data.energy_after ?? null,
        reason_if_skipped: parsed.data.reason_if_skipped ?? null,
        reason_if_failed: parsed.data.reason_if_failed ?? null,
        points_awarded: points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id,log_date" },
    )
    .select("*")
    .single();

  if (logErr || !logRow) {
    return NextResponse.json({ error: logErr?.message ?? "Log failed." }, { status: 500 });
  }

  // Recompute habit analytics from last 30 days of logs
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(thirtyDaysAgo.getDate()).padStart(2, "0")}`;

  const { data: recentLogs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("habit_id", parsed.data.habit_id)
    .eq("user_id", user.id)
    .gte("log_date", fromDate);

  const logsForCalc = (recentLogs ?? [])
    .map((r: unknown) => HabitLogSchema.safeParse(r))
    .filter((p): p is { success: true; data: z.infer<typeof HabitLogSchema> } => p.success)
    .map((p) => p.data);

  const strength = calcHabitStrength(logsForCalc);
  const { streakCurrent, streakBest, completionRate } = calcStreakAndRate(logsForCalc);

  // Update habit cached stats
  await supabase
    .from("habits")
    .update({
      strength_score: strength,
      streak_current: streakCurrent,
      streak_best: streakBest,
      completion_rate: completionRate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.habit_id)
    .eq("user_id", user.id);

  // Award gamification points
  if (points > 0) {
    const { data: gData } = await supabase
      .from("user_gamification")
      .select("total_points, streak_days")
      .eq("user_id", user.id)
      .single<{ total_points: number; streak_days: number }>();

    if (gData) {
      await supabase
        .from("user_gamification")
        .update({ total_points: gData.total_points + points })
        .eq("user_id", user.id);
    }
  }

  // Award souls based on status (idempotent via source_id = log id)
  const soulAmount = HABIT_SOUL_AMOUNTS[parsed.data.status] ?? 0;
  let soulsAwarded = 0;
  let soulState = null;
  let soulStatus = null;

  if (soulAmount > 0 && logRow?.id) {
    const reasonMap: Record<string, string> = {
      done: "ritual_completed",
      partial: "partial_trace",
      recovered: "ritual_recovered",
    };

    try {
      const result = await awardSouls({
        userId: user.id,
        sourceType: "habit_log",
        sourceId: logRow.id as string,
        amount: soulAmount,
        reason: reasonMap[parsed.data.status] ?? "habit_logged",
        metadata: { habit_id: parsed.data.habit_id, status: parsed.data.status },
      });
      soulsAwarded = result.awarded;
      soulState = result.state;
      soulStatus = getSoulCoreStatus(result.state);
    } catch (e) {
      console.error("[habit-logs] soul award failed", (e as Error).message);
    }
  }

  const log = HabitLogSchema.safeParse(logRow);
  return NextResponse.json(
    {
      log: log.success ? log.data : logRow,
      pointsAwarded: points,
      strengthScore: strength,
      streakCurrent,
      soulsAwarded,
      soulState,
      soulStatus,
    },
    { status: 201 },
  );
}
