import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  getIntervention,
  updateInterventionFlags,
} from "@/lib/interventions/queries";
import { recordInterventionActivity, type Activity } from "@/lib/interventions/journal";

const PatchBody = z.object({
  status: z.enum(["draft", "active", "completed", "archived", "dismissed"]).optional(),
  saved_to_memory: z.boolean().optional(),
  converted_to_tasks: z.boolean().optional(),
  added_to_today: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!hasSupabase()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const row = await getIntervention(user.id, id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ intervention: row });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!hasSupabase()) return NextResponse.json({ error: "no db" }, { status: 503 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const before = await getIntervention(user.id, id);
  if (!before) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const ok = await updateInterventionFlags(user.id, id, parsed.data);
  if (!ok) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  const row = await getIntervention(user.id, id);

  // Journal: every meaningful change becomes a diary entry so Shadow's
  // RAG layer can use it for analysis. Best-effort, never blocks the response.
  if (row) {
    const activities: Activity[] = [];
    if (parsed.data.status && parsed.data.status !== before.status) {
      // Note: queries.ts may downgrade "archived" to "dismissed" if the
      // remote constraint hasn't been updated yet — use the persisted value.
      const finalStatus = row.status;
      if (finalStatus === "active") activities.push("started");
      else if (finalStatus === "completed") activities.push("completed");
      else if (finalStatus === "archived") activities.push("archived");
      else if (finalStatus === "dismissed") activities.push("dismissed");
    }
    if (parsed.data.saved_to_memory && !before.saved_to_memory) {
      activities.push("saved_to_memory");
    }
    if (parsed.data.converted_to_tasks && !before.converted_to_tasks) {
      activities.push("converted");
    }
    if (parsed.data.added_to_today && !before.added_to_today) {
      activities.push("added_to_today");
    }
    for (const activity of activities) {
      await recordInterventionActivity({
        userId: user.id,
        intervention: row,
        activity,
      });
    }
  }

  return NextResponse.json({ intervention: row });
}
