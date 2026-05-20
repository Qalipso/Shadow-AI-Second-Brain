import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  InterventionRow,
  type InterventionType,
} from "./types";

export async function listInterventions(
  userId: string,
  opts: { limit?: number; type?: InterventionType } = {},
): Promise<InterventionRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("interventions")
    .select(
      "id, user_id, type, user_input, energy_level, mood, friction, result_json, first_action, status, saved_to_memory, converted_to_tasks, added_to_today, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 20);
  if (opts.type) q = q.eq("type", opts.type);
  const { data, error } = await q;
  if (error) {
    console.error("[interventions:list]", error.message);
    return [];
  }
  const parsed = InterventionRow.array().safeParse(data ?? []);
  if (!parsed.success) {
    console.error("[interventions:list] zod", parsed.error.message);
    return [];
  }
  return parsed.data;
}

export async function getIntervention(
  userId: string,
  id: string,
): Promise<InterventionRow | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("interventions")
    .select(
      "id, user_id, type, user_input, energy_level, mood, friction, result_json, first_action, status, saved_to_memory, converted_to_tasks, added_to_today, created_at",
    )
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = InterventionRow.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export type InsertInterventionInput = {
  userId: string;
  type: InterventionType;
  userInput: Record<string, unknown>;
  energyLevel: string | null;
  mood: string | null;
  friction: string | null;
  resultJson: unknown;
  firstAction: string | null;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
};

export async function insertIntervention(
  input: InsertInterventionInput,
): Promise<InterventionRow | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("interventions")
    .insert({
      user_id: input.userId,
      type: input.type,
      user_input: input.userInput,
      energy_level: input.energyLevel,
      mood: input.mood,
      friction: input.friction,
      result_json: input.resultJson,
      first_action: input.firstAction,
      model: input.model,
      tokens_in: input.tokensIn,
      tokens_out: input.tokensOut,
      cost_usd: input.costUsd,
    })
    .select(
      "id, user_id, type, user_input, energy_level, mood, friction, result_json, first_action, status, saved_to_memory, converted_to_tasks, added_to_today, created_at",
    )
    .single();
  if (error) {
    console.error("[interventions:insert]", error.message);
    return null;
  }
  const parsed = InterventionRow.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function updateInterventionFlags(
  userId: string,
  id: string,
  patch: Partial<{
    status: "draft" | "active" | "completed" | "archived" | "dismissed";
    saved_to_memory: boolean;
    converted_to_tasks: boolean;
    added_to_today: boolean;
  }>,
): Promise<boolean> {
  if (!hasSupabase()) return false;
  const supabase = await createSupabaseServerClient();
  const payload = { ...patch, updated_at: new Date().toISOString() };
  let { error } = await supabase
    .from("interventions")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", id);

  // Backwards-compat: if remote CHECK constraint hasn't been updated yet
  // (migration 20260527_interventions_polish.sql not applied), "archived"
  // may be rejected. Fall back to "dismissed" so the action still persists.
  if (error && patch.status === "archived" && /check constraint/i.test(error.message)) {
    console.warn("[interventions:update] archived rejected, retrying as dismissed");
    ({ error } = await supabase
      .from("interventions")
      .update({ ...payload, status: "dismissed" })
      .eq("user_id", userId)
      .eq("id", id));
  }

  if (error) {
    console.error("[interventions:update]", error.message);
    return false;
  }
  return true;
}
