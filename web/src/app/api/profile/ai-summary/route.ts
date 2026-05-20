import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getProfileAiSummary } from "@/lib/labs/queries";

// GET /api/profile/ai-summary
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await getProfileAiSummary(user.id);
  return NextResponse.json({ summary }, { status: 200 });
}
