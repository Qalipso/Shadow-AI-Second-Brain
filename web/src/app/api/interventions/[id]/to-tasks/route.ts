import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  getIntervention,
  updateInterventionFlags,
} from "@/lib/interventions/queries";
import { recordInterventionActivity } from "@/lib/interventions/journal";

// POST /api/interventions/[id]/to-tasks
// Body: { scope: "first" | "selected" | "all", stepIds?: string[], addToToday?: boolean }

const Body = z.object({
  scope: z.enum(["first", "selected", "all"]).default("first"),
  stepIds: z.array(z.string()).optional(),
  addToToday: z.boolean().optional().default(false),
});

type Step = {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
};

function collectSteps(result: unknown): Step[] {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  switch (r.kind) {
    case "task_shatter":
      return Array.isArray(r.steps) ? (r.steps as Step[]) : [];
    case "dopamine_menu": {
      const a = Array.isArray(r.appetizers) ? (r.appetizers as Step[]) : [];
      const e = Array.isArray(r.entrees) ? (r.entrees as Step[]) : [];
      const s = Array.isArray(r.sides) ? (r.sides as Step[]) : [];
      return [...a, ...e, ...s];
    }
    case "interest_filter": {
      const stages = Array.isArray(r.stages) ? r.stages : [];
      return stages.map((st, i) => {
        const s = st as Record<string, unknown>;
        return {
          id: `stage-${i + 1}`,
          title: String(s.name ?? `Stage ${i + 1}`),
          description: String(s.action ?? ""),
        };
      });
    }
    case "context_switch":
      return r.firstAction
        ? [{ id: "first", title: String(r.firstAction) }]
        : [];
    default:
      return [];
  }
}

function firstAction(result: unknown): Step | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (r.kind === "task_shatter" || r.kind === "context_switch") {
    if (typeof r.firstAction === "string") {
      return { id: "first", title: r.firstAction };
    }
  }
  const all = collectSteps(result);
  return all[0] ?? null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
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
    raw = {};
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { scope, stepIds, addToToday } = parsed.data;

  const intervention = await getIntervention(user.id, id);
  if (!intervention) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const all = collectSteps(intervention.result_json);
  let wanted: Step[] = [];
  if (scope === "first") {
    const f = firstAction(intervention.result_json);
    if (f) wanted = [f];
  } else if (scope === "selected") {
    if (!stepIds || stepIds.length === 0) {
      return NextResponse.json({ error: "No steps selected." }, { status: 400 });
    }
    wanted = all.filter((s) => stepIds.includes(s.id));
  } else {
    wanted = all;
  }

  if (wanted.length === 0) {
    return NextResponse.json({ error: "No steps to convert." }, { status: 400 });
  }

  type EntryRow = {
    user_id: string;
    raw_text: string;
    status: string;
    entry_type: string;
    source_intervention_id?: string;
    source_intervention_type?: string;
    estimated_minutes?: number | null;
  };

  const baseRows: EntryRow[] = wanted.map((s) => ({
    user_id: user.id,
    raw_text: s.description ? `${s.title} — ${s.description}` : s.title,
    status: "unprocessed",
    entry_type: "task",
  }));

  // Try to enrich with intervention source columns (added in migration
  // 20260527_interventions_polish.sql). If those columns are missing on
  // the remote schema, fall back to inserting the base shape so the
  // user's flow still completes.
  const enrichedRows: EntryRow[] = baseRows.map((row, i) => ({
    ...row,
    source_intervention_id: id,
    source_intervention_type: intervention.type,
    estimated_minutes: wanted[i].estimatedMinutes ?? null,
  }));

  let insertErr = (await supabase.from("entries").insert(enrichedRows)).error;
  if (insertErr) {
    // Likely missing columns on remote (migration not yet applied).
    // Retry with the base shape so the action does not silently fail.
    const isSchema =
      /column .* does not exist|schema cache|could not find/i.test(insertErr.message);
    if (isSchema) {
      console.warn(
        "[interventions:to-tasks] retrying without source columns:",
        insertErr.message,
      );
      insertErr = (await supabase.from("entries").insert(baseRows)).error;
    }
    if (insertErr) {
      console.error("[interventions:to-tasks]", insertErr.message);
      return NextResponse.json({ error: "Insert failed." }, { status: 500 });
    }
  }

  await updateInterventionFlags(user.id, id, {
    converted_to_tasks: true,
    added_to_today: addToToday ? true : intervention.added_to_today,
    status: intervention.status === "draft" ? "active" : intervention.status,
  });

  await recordInterventionActivity({
    userId: user.id,
    intervention,
    activity: addToToday ? "added_to_today" : "converted",
    extraNote: `${baseRows.length} step${baseRows.length === 1 ? "" : "s"} (${scope}).`,
  });

  return NextResponse.json({ inserted: baseRows.length, scope });
}
