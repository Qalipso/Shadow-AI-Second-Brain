import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// POST /api/insights/feedback
// Body: { report_id: string; rating: "useful" | "not_useful" }
// Upserts one row per (user_id, report_id) in insight_feedback table.

const BodySchema = z.object({
  report_id: z.string().uuid(),
  rating: z.enum(["useful", "not_useful"]),
});

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { report_id, rating } = parsed.data;

  const { error } = await supabase.from("insight_feedback").upsert(
    {
      user_id: user.id,
      report_id,
      rating,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,report_id" },
  );

  if (error) {
    // Table may not exist yet — fail gracefully
    console.error("[insights/feedback]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
