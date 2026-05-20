import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// GET /api/state-today
// Derives mood / energy / stress for today's local day from question_answers
// joined with question_bank.state_key. Plus cognitive_load = open high-priority
// tasks count.
//
// Each key returns the latest answer of the day (so user can re-answer to update).

type AnswerJoin = {
  value_numeric: number | null;
  created_at: string;
  question_bank: { state_key: string | null } | null;
};

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

  // Pull today's state-question answers, joined to their state_key.
  const { data: answers, error: ansErr } = await supabase
    .from("question_answers")
    .select("value_numeric, created_at, question_bank!inner(state_key)")
    .eq("user_id", user.id)
    .gte("created_at", isoStart)
    .not("question_bank.state_key", "is", null)
    .order("created_at", { ascending: false })
    .returns<AnswerJoin[]>();

  if (ansErr) {
    return NextResponse.json({ error: ansErr.message }, { status: 500 });
  }

  const latestByKey: Record<string, number | null> = {
    mood: null,
    energy: null,
    stress: null,
  };
  // answers are sorted DESC by created_at, so first hit per key is the freshest.
  for (const a of answers ?? []) {
    const key = a.question_bank?.state_key;
    if (!key || !(key in latestByKey)) continue;
    if (latestByKey[key] === null && a.value_numeric !== null) {
      latestByKey[key] = a.value_numeric;
    }
  }

  // Cognitive load = open tasks with priority high|critical.
  const { count: loadCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "open")
    .in("priority", ["high", "critical"]);

  // Total of any answer today (used by dashboard hero).
  const { count: answeredCount } = await supabase
    .from("question_answers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", isoStart);

  return NextResponse.json({
    mood: latestByKey.mood,
    energy: latestByKey.energy,
    stress: latestByKey.stress,
    cognitive_load: loadCount ?? 0,
    answered_count: answeredCount ?? 0,
  });
}
