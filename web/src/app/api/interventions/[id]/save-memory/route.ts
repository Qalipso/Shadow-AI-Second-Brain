import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  getIntervention,
  updateInterventionFlags,
} from "@/lib/interventions/queries";
import { recordInterventionActivity } from "@/lib/interventions/journal";

// POST /api/interventions/[id]/save-memory
// Extracts user patterns from the intervention and stores them as memory items.
// Does NOT save the full AI output. Patterns are state-aware.

const Body = z.object({
  title: z.string().min(2).max(160).optional(),
  content: z.string().min(2).max(800).optional(),
  tags: z.array(z.string()).max(8).optional(),
});

type Memory = {
  title: string;
  content: string;
  tags: string[];
  importance: number;
};

function extractPatterns(intervention: {
  type: string;
  user_input: Record<string, unknown>;
  energy_level: string | null;
  mood: string | null;
  friction: string | null;
  result_json?: unknown;
}): Memory[] {
  const ui = intervention.user_input;
  const energy = intervention.energy_level;
  const mood = intervention.mood;
  const friction = intervention.friction;
  const out: Memory[] = [];

  if (energy === "low") {
    out.push({
      title: "Low-energy intervention pattern",
      content:
        "User prefers extremely small, sensory first actions when energy is low. Avoid decision-heavy steps.",
      tags: ["intervention", "energy:low", "pattern"],
      importance: 3,
    });
  }
  if (energy === "high") {
    out.push({
      title: "High-energy intervention pattern",
      content:
        "User responds to bolder, more demanding first moves when energy is high. Mild challenge framing works.",
      tags: ["intervention", "energy:high", "pattern"],
      importance: 3,
    });
  }
  if (mood) {
    out.push({
      title: `Mood pattern: ${mood}`,
      content: `When mood is "${mood}", a Shadow intervention helped move the user from friction into action.`,
      tags: ["intervention", `mood:${mood}`, "pattern"],
      importance: 2,
    });
  }
  if (friction) {
    out.push({
      title: `Friction pattern: ${friction.replace(/_/g, " ")}`,
      content: `User commonly reports "${friction.replace(/_/g, " ")}" friction. Tiny-first-move framing tends to unstick them.`,
      tags: ["intervention", `friction:${friction}`, "pattern"],
      importance: 3,
    });
  }

  switch (intervention.type) {
    case "task_shatter":
      out.push({
        title: "Task paralysis trigger",
        content: `Task "${String(ui.task ?? "—")}" felt heavy. Breaking into tiny steps unblocked the user.`,
        tags: ["intervention", "task_shatter", "trigger"],
        importance: 4,
      });
      break;
    case "dopamine_menu":
      out.push({
        title: "Activation preference",
        content: `User prefers a structured right-now menu (5/20/10 min) when unable to choose. Energy=${energy ?? "—"} · Mood=${mood ?? "—"}.`,
        tags: ["intervention", "dopamine_menu", "activation"],
        importance: 3,
      });
      break;
    case "context_switch":
      out.push({
        title: "Context-switch ritual works",
        content: `User benefits from physical+sensory+mental bridge between modes. Pattern: "${String(ui.finished ?? "?")}" → "${String(ui.next ?? "?")}".`,
        tags: ["intervention", "context_switch", "transition"],
        importance: 3,
      });
      break;
    case "interest_filter":
      out.push({
        title: "Theme-based engagement",
        content: `User engages with boring task "${String(ui.task ?? "—")}" when wrapped in theme "${String(ui.interest ?? "—")}". Mature dark-premium framing fits.`,
        tags: ["intervention", "interest_filter", "engagement", `theme:${String(ui.interest ?? "")}`],
        importance: 4,
      });
      break;
  }

  return out.slice(0, 5);
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

  const intervention = await getIntervention(user.id, id);
  if (!intervention) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const memories: Memory[] =
    parsed.data.title && parsed.data.content
      ? [
          {
            title: parsed.data.title,
            content: parsed.data.content,
            tags: parsed.data.tags ?? ["intervention", "pattern"],
            importance: 3,
          },
        ]
      : extractPatterns(intervention);

  // Dedup: skip rows whose (source_id, title) already exists for this user.
  // Memory shouldn't accumulate duplicate patterns from repeated Save clicks.
  const { data: existing } = await supabase
    .from("memory_items")
    .select("title")
    .eq("user_id", user.id)
    .eq("source_type", "intervention")
    .eq("source_id", id);
  const existingTitles = new Set((existing ?? []).map((e) => e.title as string));

  const rows = memories
    .filter((m) => !existingTitles.has(m.title))
    .map((m) => ({
      user_id: user.id,
      source_type: "intervention",
      source_id: id,
      title: m.title,
      content: m.content,
      importance: m.importance,
      stability: "stable",
      tags: m.tags,
    }));

  if (rows.length === 0) {
    await updateInterventionFlags(user.id, id, { saved_to_memory: true });
    return NextResponse.json({ saved: true, count: 0, skipped: memories.length });
  }

  const { error: insertErr } = await supabase.from("memory_items").insert(rows);
  if (insertErr) {
    console.error("[interventions:save-memory]", insertErr.message);
    return NextResponse.json({ error: "Insert failed." }, { status: 500 });
  }

  await updateInterventionFlags(user.id, id, { saved_to_memory: true });

  await recordInterventionActivity({
    userId: user.id,
    intervention,
    activity: "saved_to_memory",
    extraNote: `${rows.length} pattern${rows.length === 1 ? "" : "s"} extracted.`,
  });

  return NextResponse.json({ saved: true, count: rows.length });
}
