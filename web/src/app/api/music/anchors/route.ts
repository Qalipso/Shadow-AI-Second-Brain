import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmotionalAnchorSchema, UserMeaningSchema } from "@/types/music";

const UpdateAnchorSchema = z.object({
  anchor_id: z.string().uuid(),
  user_meaning: UserMeaningSchema.nullable(),
});

// GET /api/music/anchors
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ anchors: [], mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data } = await supabase
    .from("emotional_anchors")
    .select("*")
    .eq("user_id", user.id)
    .order("play_count", { ascending: false });

  const anchors = (data ?? [])
    .map((row: unknown) => EmotionalAnchorSchema.safeParse(row))
    .filter((p): p is { success: true; data: z.infer<typeof EmotionalAnchorSchema> } => p.success)
    .map((p) => p.data);

  return NextResponse.json({ anchors });
}

// PATCH /api/music/anchors — label a track
export async function PATCH(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = UpdateAnchorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { error } = await supabase
    .from("emotional_anchors")
    .update({ user_meaning: parsed.data.user_meaning, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.anchor_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
