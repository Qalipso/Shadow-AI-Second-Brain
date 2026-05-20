import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  calcReflectionPoints,
  getLevelName,
  levelFromPoints,
  pointsToNext,
  type GamificationResult,
} from "@/lib/gamification/points";

const MAIN_SLOTS = [
  "work", "money", "health", "energy", "food", "mind",
  "creativity", "social", "emotion", "discipline", "environment", "meaning",
] as const;

const PSYCH_SLOTS = ["autonomy", "inner_noise", "self_compassion"] as const;

const UpsertSchema = z.object({
  scored_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scores: z.object({
    work: z.number().int().min(0).max(10).nullable().optional(),
    money: z.number().int().min(0).max(10).nullable().optional(),
    health: z.number().int().min(0).max(10).nullable().optional(),
    energy: z.number().int().min(0).max(10).nullable().optional(),
    food: z.number().int().min(0).max(10).nullable().optional(),
    mind: z.number().int().min(0).max(10).nullable().optional(),
    creativity: z.number().int().min(0).max(10).nullable().optional(),
    social: z.number().int().min(0).max(10).nullable().optional(),
    emotion: z.number().int().min(0).max(10).nullable().optional(),
    discipline: z.number().int().min(0).max(10).nullable().optional(),
    environment: z.number().int().min(0).max(10).nullable().optional(),
    meaning: z.number().int().min(0).max(10).nullable().optional(),
    autonomy: z.number().int().min(0).max(10).nullable().optional(),
    inner_noise: z.number().int().min(0).max(10).nullable().optional(),
    self_compassion: z.number().int().min(0).max(10).nullable().optional(),
  }),
});

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date param required (YYYY-MM-DD)" }, { status: 400 });
  }

  if (!hasSupabase()) {
    return NextResponse.json({ data: null });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("daily_wheel_scores")
      .select("*")
      .eq("user_id", user.id)
      .eq("scored_date", date)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[reflection GET]", error.message);
      return NextResponse.json({ error: "Failed to load reflection" }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? null });
  } catch (e) {
    console.error("[reflection GET]", (e as Error).message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 422 });
  }

  const { scored_date, scores } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("daily_wheel_scores")
      .upsert(
        { user_id: user.id, scored_date, ...scores, submitted_at: new Date().toISOString() },
        { onConflict: "user_id,scored_date" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("[reflection POST upsert]", error.message);
      return NextResponse.json({ error: "Failed to save reflection" }, { status: 500 });
    }

    // ── Gamification ───────────────────────────────────────────────────────────
    let gamification: GamificationResult | null = null;
    try {
      const answeredMain = MAIN_SLOTS.filter((s) => scores[s] != null).length;
      const answeredPsych = PSYCH_SLOTS.filter((s) => scores[s] != null).length;

      const { data: gam } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const today = scored_date;
      const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000)
        .toISOString()
        .slice(0, 10);

      const lastDate: string | null = gam?.last_reflection_date ?? null;
      const isFirstToday = lastDate !== today;

      // Streak calculation
      let newStreak = 1;
      if (lastDate === today) newStreak = gam?.streak_days ?? 1;
      else if (lastDate === yesterday) newStreak = (gam?.streak_days ?? 0) + 1;

      const pointsEarned = isFirstToday
        ? calcReflectionPoints({ answeredMainCount: answeredMain, answeredPsychCount: answeredPsych, streakDays: newStreak })
        : 0;

      const oldTotal = gam?.total_points ?? 0;
      const newTotal = oldTotal + pointsEarned;
      const oldLevel = gam?.level ?? 1;
      const newLevel = levelFromPoints(newTotal);

      await supabase.from("user_gamification").upsert(
        {
          user_id: user.id,
          total_points: newTotal,
          level: newLevel,
          streak_days: newStreak,
          last_reflection_date: today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      gamification = {
        pointsEarned,
        newTotal,
        level: newLevel,
        levelName: getLevelName(newLevel),
        streak: newStreak,
        leveledUp: newLevel > oldLevel,
        pointsToNext: pointsToNext(newTotal, newLevel),
      };
    } catch {
      // Gamification is non-critical — degrade gracefully
    }

    return NextResponse.json({ data, gamification });
  } catch (e) {
    console.error("[reflection POST]", (e as Error).message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
