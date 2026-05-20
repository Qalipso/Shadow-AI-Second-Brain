import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// POST /api/shadow/feedback
// Body: { reply_id?: string, entry_id?: string, rating: -1 | 1, context?: string }

const RequestSchema = z.object({
  reply_id: z.string().uuid().optional(),
  entry_id: z.string().uuid().optional(),
  rating: z.union([z.literal(-1), z.literal(1)]),
  context: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await request.json();
    const result = RequestSchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request.", details: result.error.flatten() },
        { status: 400 },
      );
    }
    body = result.data;
  } catch {
    return NextResponse.json({ error: "Could not parse request body." }, { status: 400 });
  }

  const { error } = await supabase.from("ai_feedback").insert({
    user_id: user.id,
    reply_id: body.reply_id ?? null,
    entry_id: body.entry_id ?? null,
    rating: body.rating,
    context: body.context ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
