import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// Phase 3.4: question_answers API.
// POST { answers: [{question_id, value_text? | value_numeric?}] } → bulk insert
// GET ?date=YYYY-MM-DD → list today's answers for the user

const AnswerInputSchema = z.object({
  question_id: z.number().int(),
  value_text: z.string().max(8000).nullable().optional(),
  value_numeric: z.number().nullable().optional(),
});

const BulkSchema = z.object({
  answers: z.array(AnswerInputSchema).min(1).max(20),
});

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rows = parsed.data.answers.map((a) => ({
    user_id: user.id,
    question_id: a.question_id,
    value_text: a.value_text ?? null,
    value_numeric: a.value_numeric ?? null,
  }));

  const { data, error } = await supabase
    .from("question_answers")
    .insert(rows)
    .select("id, question_id, value_text, value_numeric, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0, rows: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ answers: [] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  let q = supabase
    .from("question_answers")
    .select("id, question_id, value_text, value_numeric, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      q = q.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ answers: data ?? [] });
}
