import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLabsTests, getCompletedTestSlugs } from "@/lib/labs/queries";

// GET /api/labs/tests
// Returns active tests with completion status for the current user.
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [tests, completedSlugs] = await Promise.all([
    getLabsTests(),
    getCompletedTestSlugs(user.id),
  ]);

  const completedSet = new Set(completedSlugs);
  const testsWithStatus = tests.map((t) => ({
    ...t,
    completed: completedSet.has(t.slug),
  }));

  return NextResponse.json({ tests: testsWithStatus }, { status: 200 });
}
