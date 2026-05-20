import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { GoalSchema } from "@/types/db";

const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  why: z.string().max(2000).nullable().optional(),
  linked_life_areas: z.array(z.string()).optional(),
  goal_type: z.enum(["outcome","identity","recovery","skill","project","experiment"]).nullable().optional(),
  status: z.enum(["active","paused","completed","abandoned"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().nullable().optional(),
  clarity_score: z.number().int().min(0).max(10).nullable().optional(),
  energy_score: z.number().int().min(0).max(10).nullable().optional(),
});

async function getOwnedGoal(id: string) {
  if (!hasSupabase()) return { error: "Local mode." as const, status: 503 };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized." as const, status: 401 };
  return { supabase, user };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ctxRes = await getOwnedGoal(id);
  if ("error" in ctxRes) return NextResponse.json({ error: ctxRes.error }, { status: ctxRes.status });
  const { supabase, user } = ctxRes;

  const { data, error } = await supabase
    .from("goals").select("*").eq("id", id).eq("user_id", user.id).single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found." }, { status: 404 });
  const parsed = GoalSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  return NextResponse.json({ goal: parsed.data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = UpdateGoalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const ctxRes = await getOwnedGoal(id);
  if ("error" in ctxRes) return NextResponse.json({ error: ctxRes.error }, { status: ctxRes.status });
  const { supabase, user } = ctxRes;

  const { data, error } = await supabase
    .from("goals").update(parsed.data).eq("id", id).eq("user_id", user.id).select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  const out = GoalSchema.safeParse(data);
  if (!out.success) return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  return NextResponse.json({ goal: out.data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ctxRes = await getOwnedGoal(id);
  if ("error" in ctxRes) return NextResponse.json({ error: ctxRes.error }, { status: ctxRes.status });
  const { supabase, user } = ctxRes;
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
