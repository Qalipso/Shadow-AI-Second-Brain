import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { TaskSchema } from "@/types/db";

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  status: z.enum(["open","done","dropped"]).optional(),
  priority: z.enum(["low","medium","high","critical"]).nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  mission_id: z.string().uuid().nullable().optional(),
  energy_cost: z.number().int().min(0).max(10).nullable().optional(),
  linked_life_areas: z.array(z.string()).default([]),
  due_at: z.string().nullable().optional(),
  created_from_inbox: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ tasks: [], mode: "local" });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const goalId = req.nextUrl.searchParams.get("goal_id");
  const missionId = req.nextUrl.searchParams.get("mission_id");
  const status = req.nextUrl.searchParams.get("status");

  let q = supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (goalId) q = q.eq("goal_id", goalId);
  if (missionId) q = q.eq("mission_id", missionId);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = (data ?? [])
    .map((row: unknown) => TaskSchema.safeParse(row))
    .filter((p): p is { success: true; data: z.infer<typeof TaskSchema> } => p.success)
    .map((p) => p.data);
  return NextResponse.json({ tasks, mode: "db" });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("tasks")
    .insert({ user_id: user.id, ...parsed.data })
    .select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  const out = TaskSchema.safeParse(data);
  if (!out.success) return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  return NextResponse.json({ task: out.data }, { status: 201 });
}
