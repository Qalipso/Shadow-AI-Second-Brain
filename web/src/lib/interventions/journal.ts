import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { generateEmbedding } from "@/lib/embeddings";
import { hasLlm } from "@/lib/llm";
import type { InterventionRow } from "./types";

// Activity types that produce a journal entry. Best-effort; failures
// must never block the user-facing action.
export type Activity =
  | "started"
  | "completed"
  | "archived"
  | "dismissed"
  | "converted"
  | "added_to_today"
  | "saved_to_memory"
  | "generated";

// Read a user-facing label from intervention input.
function summarizeInput(intervention: InterventionRow): string {
  const ui = intervention.user_input;
  switch (intervention.type) {
    case "task_shatter":
      return String(ui.task ?? "—");
    case "dopamine_menu":
      return String(ui.intent ?? "right-now menu");
    case "context_switch":
      return `${String(ui.finished ?? "?")} → ${String(ui.next ?? "?")}`;
    case "interest_filter":
      return `${String(ui.task ?? "?")} · theme ${String(ui.interest ?? "?")}`;
  }
}

function actionPhrase(activity: Activity, intervention: InterventionRow): string {
  const sub = summarizeInput(intervention);
  switch (activity) {
    case "started":
      return `Started a Shadow intervention (${intervention.type.replace(/_/g, " ")}): ${sub}.`;
    case "completed":
      return `Completed a Shadow intervention (${intervention.type.replace(/_/g, " ")}): ${sub}. The journey is closed.`;
    case "archived":
      return `Archived a Shadow intervention (${intervention.type.replace(/_/g, " ")}): ${sub}.`;
    case "dismissed":
      return `Dismissed a Shadow intervention (${intervention.type.replace(/_/g, " ")}): ${sub}.`;
    case "converted":
      return `Converted intervention steps into tasks (${intervention.type.replace(/_/g, " ")}): ${sub}.`;
    case "added_to_today":
      return `Added an intervention action to today (${intervention.type.replace(/_/g, " ")}): ${sub}.`;
    case "saved_to_memory":
      return `Saved a Shadow pattern to memory from a ${intervention.type.replace(/_/g, " ")} intervention.`;
    case "generated":
      return `Generated a Shadow intervention (${intervention.type.replace(/_/g, " ")}) for: ${sub}.`;
  }
}

type InsertRow = {
  user_id: string;
  raw_text: string;
  status: string;
  entry_type: string;
  summary?: string;
  source_intervention_id?: string;
  source_intervention_type?: string;
  embedding?: unknown;
};

// Records an intervention activity as an entries row so the diary
// captures everything the user did with Shadow.
// Best-effort: never throws. Returns true on success.
export async function recordInterventionActivity(args: {
  userId: string;
  intervention: InterventionRow;
  activity: Activity;
  extraNote?: string;
}): Promise<boolean> {
  if (!hasSupabase()) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const phrase = actionPhrase(args.activity, args.intervention);
    const text = args.extraNote ? `${phrase} ${args.extraNote}` : phrase;

    // Dedup: skip if an identical-summary event for this intervention
    // was recorded in the last 60 seconds. Prevents double-PATCH or
    // hot-reload double-fires from spamming the journal.
    const sixtyAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabase
      .from("entries")
      .select("id, summary")
      .eq("user_id", args.userId)
      .eq("entry_type", "event")
      .gte("created_at", sixtyAgo)
      .limit(20);
    if (
      (recent ?? []).some(
        (r: { summary?: string | null }) => r.summary === phrase,
      )
    ) {
      return true;
    }

    // Try to embed for RAG (best-effort, optional).
    let embedding: unknown = null;
    if (hasLlm()) {
      try {
        const v = await generateEmbedding(text);
        embedding = JSON.stringify(v.embedding);
      } catch {
        embedding = null;
      }
    }

    const enriched: InsertRow = {
      user_id: args.userId,
      raw_text: text,
      summary: phrase,
      status: "processed",
      entry_type: "event",
      source_intervention_id: args.intervention.id,
      source_intervention_type: args.intervention.type,
      ...(embedding ? { embedding } : {}),
    };

    let { error } = await supabase.from("entries").insert(enriched);
    if (error) {
      const isSchema =
        /column .* does not exist|schema cache|could not find/i.test(error.message);
      if (isSchema) {
        const base: InsertRow = {
          user_id: args.userId,
          raw_text: text,
          summary: phrase,
          status: "processed",
          entry_type: "event",
          ...(embedding ? { embedding } : {}),
        };
        ({ error } = await supabase.from("entries").insert(base));
      }
    }
    if (error) {
      console.warn("[interventions:journal] insert failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[interventions:journal] threw:", (e as Error).message);
    return false;
  }
}
