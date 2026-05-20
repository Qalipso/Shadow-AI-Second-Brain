import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

const PatchSchema = z.object({
  status: z.enum(["shown", "answered", "skipped", "snoozed", "dismissed"]),
  answer_text: z.string().max(8000).optional(),
});

// PATCH /api/ai-questions/[id]
// Body: { status, answer_text? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { status, answer_text } = parsed.data;

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status, updated_at: now };
  if (status === "shown") update.shown_at = now;
  if (status === "snoozed") {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + 24);
    update.snoozed_until = snoozedUntil.toISOString();
  }

  const { error: updateError } = await supabase
    .from("ai_questions")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Save answer text if provided
  if (status === "answered" && answer_text?.trim()) {
    await supabase.from("ai_question_answers").insert({
      user_id: user.id,
      question_id: id,
      answer_text: answer_text.trim(),
    });
  }

  return NextResponse.json({ ok: true });
}
