import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { jsonError } from "@/lib/api-response";

// GET /api/settings  — load persisted user settings
// PATCH /api/settings — upsert user settings (partial update OK)

const PatchSchema = z.object({
  questions_per_day: z.number().int().min(1).max(20).optional(),
  ai_tone: z.string().max(50).optional(),
  show_questions_on_first_open: z.boolean().optional(),
  memory_enabled: z.boolean().optional(),
});

export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ settings: null, mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await supabase
    .from("user_settings")
    .select("questions_per_day, ai_tone, show_questions_on_first_open, memory_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return jsonError(500, "Failed to load settings.", { logDetail: error.message, logTag: "[settings:GET]" });

  return NextResponse.json({ settings: data ?? null, mode: "db" });
}

export async function PATCH(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...parsed.data, updated_at: now },
      { onConflict: "user_id" },
    )
    .select("questions_per_day, ai_tone, show_questions_on_first_open, memory_enabled")
    .single();

  if (error) return jsonError(500, "Failed to save settings.", { logDetail: error.message, logTag: "[settings:PATCH]" });

  return NextResponse.json({ settings: data, mode: "db" });
}
