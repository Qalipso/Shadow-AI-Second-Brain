import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MissionSchema } from "@/types/db";

const UpdateMissionSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  status: z.enum(["active","paused","completed","blocked","abandoned"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  linked_life_areas: z.array(z.string()).optional(),
  blocker: z.string().max(1000).nullable().optional(),
  outcome: z.string().max(2000).nullable().optional(),
  deadline: z.string().nullable().optional(),
  notes: z.string().max(50000).nullable().optional(),
});

async function ownerCtx() {
  if (!hasSupabase()) return { err: "Local mode." as const, status: 503 };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { err: "Unauthorized." as const, status: 401 };
  return { supabase, user };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await ownerCtx();
  if ("err" in c) return NextResponse.json({ error: c.err }, { status: c.status });
  const { data, error } = await c.supabase
    .from("missions").select("*").eq("id", id).eq("user_id", c.user.id).single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found." }, { status: 404 });
  const p = MissionSchema.safeParse(data);
  if (!p.success) return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  return NextResponse.json({ mission: p.data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = UpdateMissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const c = await ownerCtx();
  if ("err" in c) return NextResponse.json({ error: c.err }, { status: c.status });
  const { data, error } = await c.supabase
    .from("missions").update(parsed.data).eq("id", id).eq("user_id", c.user.id).select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 500 });
  const p = MissionSchema.safeParse(data);
  if (!p.success) return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  return NextResponse.json({ mission: p.data });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = await ownerCtx();
  if ("err" in c) return NextResponse.json({ error: c.err }, { status: c.status });
  const { error } = await c.supabase.from("missions").delete().eq("id", id).eq("user_id", c.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
