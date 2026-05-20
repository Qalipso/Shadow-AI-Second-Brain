import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { z } from "zod";

const ParamSchema = z.object({ id: z.string().uuid() });

// ─── DELETE /api/entries/[id] ─────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rawParams = await params;
  const parsed = ParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid entry id." }, { status: 400 });
  }

  if (!hasSupabase()) {
    // Dev mode — client manages local store; just acknowledge.
    return NextResponse.json({ deleted: true, mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // RLS enforced, but also filter by user_id explicitly for safety.
  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, mode: "db" });
}
