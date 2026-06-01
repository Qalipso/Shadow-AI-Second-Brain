import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// GET /api/state-today
// Derives mood / energy / stress / cognitive_load for today from:
//   1. question_answers joined with question_bank.state_key  (DailyCheckIn, 1-10 scale)
//   2. daily_checkins fallback                               (CheckInWizard, 1-5 scale → ×2 to get 0-10)
// Returns the latest value of the day per key.

export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({
      mood: null,
      energy: null,
      stress: null,
      cognitive_load: 0,
      answered_count: 0,
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isoStart = todayStart.toISOString();

  const latestByKey: Record<string, number | null> = {
    mood: null,
    energy: null,
    stress: null,
    cognitive_load: null,
  };

  // ── Step 1: Build question_id → state_key map from question_bank ────────────
  // Explicit two-step avoids fragile PostgREST join-filter on embedded resources.
  const { data: stateQRows } = await supabase
    .from("question_bank")
    .select("id, state_key")
    .eq("is_state_question", true)
    .not("state_key", "is", null);

  const qidToKey = new Map<number, string>(
    (stateQRows ?? [])
      .filter((r): r is { id: number; state_key: string } => !!r.state_key)
      .map((r) => [r.id, r.state_key]),
  );

  // ── Step 2: Pull today's answers for those question ids ─────────────────────
  if (qidToKey.size > 0) {
    const { data: answers } = await supabase
      .from("question_answers")
      .select("question_id, value_numeric, created_at")
      .eq("user_id", user.id)
      .gte("created_at", isoStart)
      .in("question_id", [...qidToKey.keys()])
      .order("created_at", { ascending: false });

    for (const a of answers ?? []) {
      const key = qidToKey.get(a.question_id);
      if (!key || !(key in latestByKey)) continue;
      if (latestByKey[key] === null && a.value_numeric !== null) {
        latestByKey[key] = a.value_numeric;
      }
    }
  }

  // ── Step 3: Fall back to daily_checkins (CheckInWizard, 1-5 scale) ──────────
  // Multiply by 2 to map 1-5 → 2-10 (consistent with DailyCheckIn 1-10 range).
  const { data: checkin } = await supabase
    .from("daily_checkins")
    .select("energy, mood, mental_noise, focus")
    .eq("user_id", user.id)
    .gte("created_at", isoStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkin) {
    if (latestByKey.energy === null && checkin.energy != null)
      latestByKey.energy = checkin.energy * 2;
    if (latestByKey.mood === null && checkin.mood != null)
      latestByKey.mood = checkin.mood * 2; // 1-5 → 2-10 (was +5, wrong)
    if (latestByKey.stress === null && checkin.mental_noise != null)
      latestByKey.stress = checkin.mental_noise * 2;
    if (latestByKey.cognitive_load === null && checkin.focus != null)
      latestByKey.cognitive_load = checkin.focus * 2;
  }

  // ── Step 4: Cognitive-load fallback — count open high-priority tasks ─────────
  const { count: loadCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "open")
    .in("priority", ["high", "critical"]);

  // Total answers today (used by dashboard hero).
  const { count: answeredCount } = await supabase
    .from("question_answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", isoStart);

  return NextResponse.json({
    mood: latestByKey.mood,
    energy: latestByKey.energy,
    stress: latestByKey.stress,
    cognitive_load: latestByKey.cognitive_load ?? loadCount ?? 0,
    answered_count: answeredCount ?? 0,
  });
}
