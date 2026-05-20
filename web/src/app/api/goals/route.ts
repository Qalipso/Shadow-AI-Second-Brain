import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { GoalSchema } from "@/types/db";

const CreateGoalInputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  why: z.string().max(1000).optional(),
  linked_life_areas: z.array(z.string()).default([]),
  goal_type: z.enum(["outcome","identity","recovery","skill","project","experiment"]).optional(),
  deadline: z.string().optional(),
  clarity_score: z.number().int().min(0).max(10).optional(),
  energy_score: z.number().int().min(0).max(10).optional(),
});

// ─── GET /api/goals ──────────────────────────────────────────────────────────
export async function GET() {
  if (!hasSupabase()) return NextResponse.json({ goals: [], mode: "local" });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const goals = (data ?? [])
    .map((row: unknown) => GoalSchema.safeParse(row))
    .filter((p): p is { success: true; data: z.infer<typeof GoalSchema> } => p.success)
    .map((p) => p.data);

  return NextResponse.json({ goals, mode: "db" });
}

// ─── POST /api/goals ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = CreateGoalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: user.id, ...parsed.data })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  const goal = GoalSchema.safeParse(data);
  if (!goal.success) {
    return NextResponse.json({ error: "Insert validation failed." }, { status: 500 });
  }

  return NextResponse.json({ goal: goal.data }, { status: 201 });
}
