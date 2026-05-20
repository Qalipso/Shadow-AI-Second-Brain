import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLabsTestBySlug, getLabsQuestionsWithOptions, getUserSessionsForTest } from "@/lib/labs/queries";

// GET /api/labs/tests/[slug]
// Returns test definition, questions with answer options, and user session history.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const test = await getLabsTestBySlug(slug);
  if (!test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  const [questions, sessions] = await Promise.all([
    getLabsQuestionsWithOptions(test.id),
    getUserSessionsForTest(user.id, test.id),
  ]);

  return NextResponse.json({ test, questions, sessions }, { status: 200 });
}
