import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { HabitSchema } from "@/types/db";

const CreateHabitInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["binary", "measurable", "timer", "avoidance", "ritual"]).default("binary"),
  sphere_slugs: z.array(z.string()).default([]),
  schedule: z.object({
    type: z.enum(["daily", "weekly", "specific_days", "times_per_week"]),
    daysOfWeek: z.array(z.string()).optional(),
    timesPerWeek: z.number().int().optional(),
    timeWindow: z.object({ start: z.string().optional(), end: z.string().optional() }).optional(),
  }),
  target_value: z.number().optional(),
  target_unit: z.string().optional(),
  minimum_version: z.string().max(500).optional(),
  ideal_version: z.string().max(500).optional(),
  why: z.string().max(1000).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  evidence_types: z.array(z.string()).default(["manual"]),
  reminder_enabled: z.boolean().default(false),
  reminder_time: z.string().optional(),
});

// ─── GET /api/habits ────────────────────────────────────────────────────────
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ habits: [], mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const habits = (data ?? [])
    .map((row: unknown) => HabitSchema.safeParse(row))
    .filter((p): p is { success: true; data: z.infer<typeof HabitSchema> } => p.success)
    .map((p) => p.data);

  return NextResponse.json({ habits, mode: "db" });
}

// ─── POST /api/habits ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = CreateHabitInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      ...parsed.data,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  const habit = HabitSchema.safeParse(data);
  if (!habit.success) {
    return NextResponse.json({ error: "Insert validation failed." }, { status: 500 });
  }

  return NextResponse.json({ habit: habit.data }, { status: 201 });
}
