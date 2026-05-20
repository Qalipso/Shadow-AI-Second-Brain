import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLabsTestBySlug, createLabsSession } from "@/lib/labs/queries";

const CreateSessionBodySchema = z.object({
  test_slug: z.string().min(1),
});

// POST /api/labs/sessions
// Creates a new in-progress session for a test.
export async function POST(req: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: z.infer<typeof CreateSessionBodySchema>;
  try {
    body = CreateSessionBodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const test = await getLabsTestBySlug(body.test_slug);
  if (!test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  const session = await createLabsSession(user.id, test.id, test.version);
  if (!session) {
    return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
  }

  return NextResponse.json({ session }, { status: 201 });
}
