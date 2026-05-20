import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { HabitLogStatusSchema } from "@/types/db";

const UpdateHabitLogInput = z.object({
  status: HabitLogStatusSchema.optional(),
  value: z.number().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  mood_after: z.number().int().min(1).max(10).nullable().optional(),
  energy_after: z.number().int().min(1).max(10).nullable().optional(),
  reason_if_skipped: z.string().nullable().optional(),
  reason_if_failed: z.string().nullable().optional(),
});

// ─── PATCH /api/habit-logs/[id] ─────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!hasSupabase()) return NextResponse.json({ error: "No DB." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = UpdateHabitLogInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("habit_logs")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}
