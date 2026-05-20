import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

const VALID_STATUSES = ["accepted", "done", "snoozed", "dismissed"] as const;
const StatusSchema = z.enum(VALID_STATUSES);

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/initiatives/[id]
// Updates the status of a shadow_initiative. Validates against allowed enum values.
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing initiative id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = StatusSchema.safeParse((body as Record<string, unknown>)?.status);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.`,
      },
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

  const { data, error } = await supabase
    .from("shadow_initiatives")
    .update({ status: parsed.data })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Initiative not found or access denied." }, { status: 404 });
  }

  return NextResponse.json({ initiative: data }, { status: 200 });
}
