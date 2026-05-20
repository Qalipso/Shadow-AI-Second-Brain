import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

const CheckInInputSchema = z.object({
  energy: z.number().int().min(0).max(5).optional(),
  mood: z.number().int().min(-5).max(5).optional(),
  mental_noise: z.number().int().min(0).max(5).optional(),
  body_state: z.number().int().min(0).max(5).optional(),
  focus: z.number().int().min(0).max(5).optional(),
  inbox_dump: z.string().max(5000).optional(),
  today_focus: z.string().max(200).optional(),
  today_focus_custom: z.string().max(500).optional(),
  habit_id_today: z.string().uuid().optional(),
  linked_goal_id: z.string().uuid().optional(),
  insight_text: z.string().max(1000).optional(),
  ai_question_id: z.string().uuid().optional(),
  ai_question_answer: z.string().max(2000).optional(),
});

// ─── POST /api/checkin ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = CheckInInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  if (!hasSupabase()) {
    return NextResponse.json(
      { checkin_id: null, success: true, today_initiative: null, mode: "local" },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const insertPayload = {
    user_id: user.id,
    date: today,
    ...(parsed.data.energy !== undefined && { energy: parsed.data.energy }),
    ...(parsed.data.mood !== undefined && { mood: parsed.data.mood }),
    ...(parsed.data.mental_noise !== undefined && { mental_noise: parsed.data.mental_noise }),
    ...(parsed.data.body_state !== undefined && { body_state: parsed.data.body_state }),
    ...(parsed.data.focus !== undefined && { focus: parsed.data.focus }),
    ...(parsed.data.inbox_dump !== undefined && { inbox_dump: parsed.data.inbox_dump }),
    ...(parsed.data.today_focus !== undefined && { today_focus: parsed.data.today_focus }),
    ...(parsed.data.today_focus_custom !== undefined && { today_focus_custom: parsed.data.today_focus_custom }),
    ...(parsed.data.habit_id_today !== undefined && { habit_id_today: parsed.data.habit_id_today }),
    ...(parsed.data.linked_goal_id !== undefined && { linked_goal_id: parsed.data.linked_goal_id }),
    ...(parsed.data.insight_text !== undefined && { insight_text: parsed.data.insight_text }),
    ...(parsed.data.ai_question_id !== undefined && { ai_question_id: parsed.data.ai_question_id }),
    ...(parsed.data.ai_question_answer !== undefined && { ai_question_answer: parsed.data.ai_question_answer }),
  };

  const { data: checkin, error: upsertError } = await supabase
    .from("daily_checkins")
    .insert(insertPayload)
    .select("id")
    .single();

  if (upsertError || !checkin) {
    return NextResponse.json(
      { error: upsertError?.message ?? "Upsert failed." },
      { status: 500 },
    );
  }

  const checkinId: string = checkin.id as string;

  // Best-effort: handle AI question answer
  if (parsed.data.ai_question_id && parsed.data.ai_question_answer) {
    try {
      await supabase
        .from("ai_question_answers")
        .insert({
          user_id: user.id,
          question_id: parsed.data.ai_question_id,
          answer_text: parsed.data.ai_question_answer,
          checkin_id: checkinId,
        });

      await supabase
        .from("ai_questions")
        .update({ status: "answered" })
        .eq("id", parsed.data.ai_question_id)
        .eq("user_id", user.id);
    } catch {
      // non-critical
    }
  }

  // Best-effort: save insight as memory_item
  const insightContent = parsed.data.insight_text ?? parsed.data.ai_question_answer;
  if (insightContent?.trim()) {
    try {
      await supabase
        .from("memory_items")
        .insert({
          user_id: user.id,
          content: insightContent.trim(),
          memory_type: "insight",
          importance: 3,
          stability: "stable",
          source_type: "checkin",
          source_id: checkinId,
        });
    } catch {
      // non-critical
    }
  }

  // Best-effort: save current_state memory for today
  if (parsed.data.today_focus || parsed.data.energy !== undefined) {
    const stateContent = [
      parsed.data.energy !== undefined ? `Energy: ${parsed.data.energy}/5` : null,
      parsed.data.mood !== undefined ? `Mood: ${parsed.data.mood}` : null,
      parsed.data.today_focus ? `Focus intent: ${parsed.data.today_focus}` : null,
      parsed.data.today_focus_custom ? `Custom focus: ${parsed.data.today_focus_custom}` : null,
    ]
      .filter(Boolean)
      .join(". ");

    if (stateContent) {
      try {
        await supabase
          .from("memory_items")
          .upsert(
            {
              user_id: user.id,
              content: stateContent,
              memory_type: "current_state",
              importance: 2,
              stability: "temporary",
              source_type: "checkin",
              source_id: checkinId,
              date: today,
            },
            { onConflict: "user_id,date,memory_type" },
          );
      } catch {
        // non-critical
      }
    }
  }

  return NextResponse.json({ checkin_id: checkinId, success: true, today_initiative: null });
}
