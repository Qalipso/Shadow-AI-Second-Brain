import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MissionSchema } from "@/types/db";

const CreateMissionSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  goal_id: z.string().uuid().nullable().optional(),
  status: z.enum(["active","paused","completed","blocked","abandoned"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  linked_life_areas: z.array(z.string()).default([]),
  blocker: z.string().max(1000).nullable().optional(),
});

export async function GET(req: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ missions: [], mode: "local" });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const goalId = req.nextUrl.searchParams.get("goal_id");
  let q = supabase.from("missions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (goalId) q = q.eq("goal_id", goalId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const missions = (data ?? [])
    .map((row: unknown) => MissionSchema.safeParse(row))
    .filter((p): p is { success: true; data: z.infer<typeof MissionSchema> } => p.success)
    .map((p) => p.data);
  return NextResponse.json({ missions, mode: "db" });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = CreateMissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("missions")
    .insert({ user_id: user.id, ...parsed.data })
    .select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  const out = MissionSchema.safeParse(data);
  if (!out.success) return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  return NextResponse.json({ mission: out.data }, { status: 201 });
}
