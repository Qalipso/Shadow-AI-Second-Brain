import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLabsResult } from "@/lib/labs/queries";

// GET /api/labs/results/[sessionId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await getLabsResult(sessionId);
  if (!result || result.user_id !== user.id) {
    return NextResponse.json({ error: "Result not found." }, { status: 404 });
  }

  // Also fetch test info for display
  const { data: test } = await supabase
    .from("labs_tests")
    .select("slug, title, category")
    .eq("id", result.test_id)
    .single();

  return NextResponse.json({ result, test }, { status: 200 });
}
