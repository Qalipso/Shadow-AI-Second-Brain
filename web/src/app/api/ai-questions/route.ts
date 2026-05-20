import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

const VALID_QUESTION_TYPES = [
  "reflection",
  "clarification",
  "pattern_check",
  "future_intent",
  "values_probe",
  "emotional_check",
  "open",
] as const;

const CreateQuestionSchema = z.object({
  question_text: z.string().min(1).max(1000),
  question_type: z.enum(VALID_QUESTION_TYPES),
  gap_id: z.string().uuid().optional(),
});

// ─── GET /api/ai-questions ────────────────────────────────────────────────────
// Query params: status (default "pending"), limit (default 1)
export async function GET(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ questions: [] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") ?? "pending";
  const limitRaw = parseInt(sp.get("limit") ?? "1", 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 1;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("ai_questions")
    .select(
      "id, user_id, gap_id, question_text, question_type, status, shown_at, snoozed_until, expires_at, created_at",
    )
    .eq("user_id", user.id)
    .eq("status", status)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}

// ─── POST /api/ai-questions ───────────────────────────────────────────────────
// Body: { question_text, question_type, gap_id? }
export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("ai_questions")
    .insert({
      user_id: user.id,
      question_text: parsed.data.question_text,
      question_type: parsed.data.question_type,
      gap_id: parsed.data.gap_id ?? null,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .select(
      "id, user_id, gap_id, question_text, question_type, status, shown_at, snoozed_until, expires_at, created_at",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ question: data }, { status: 201 });
}
