import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { HabitSchema } from "@/types/db";

const UpdateHabitInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  type: z.enum(["binary", "measurable", "timer", "avoidance", "ritual"]).optional(),
  sphere_slugs: z.array(z.string()).optional(),
  schedule: z.object({
    type: z.enum(["daily", "weekly", "specific_days", "times_per_week"]),
    daysOfWeek: z.array(z.string()).optional(),
    timesPerWeek: z.number().int().optional(),
    timeWindow: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
  }).optional(),
  target_value: z.number().nullable().optional(),
  target_unit: z.string().nullable().optional(),
  minimum_version: z.string().nullable().optional(),
  ideal_version: z.string().nullable().optional(),
  why: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  evidence_types: z.array(z.string()).optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_time: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(50000).nullable().optional(),
});

// ─── PATCH /api/habits/[id] ─────────────────────────────────────────────────
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

  const parsed = UpdateHabitInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("habits")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  }

  const habit = HabitSchema.safeParse(data);
  return NextResponse.json({ habit: habit.success ? habit.data : data });
}

// ─── DELETE /api/habits/[id] ─────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!hasSupabase()) return NextResponse.json({ error: "No DB." }, { status: 503 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Soft-delete: set is_active = false
  const { error } = await supabase
    .from("habits")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
