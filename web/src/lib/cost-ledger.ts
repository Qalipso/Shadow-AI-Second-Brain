import "server-only";
import { createSupabaseServerClient } from "./supabase/server";
import { hasSupabase } from "./supabase/env";

// Daily cost guard. Reads sum(cost_usd) from ai_processing_logs for today.
// Returns true if over the cap. Used by API routes to short-circuit with 429
// before calling the LLM.

export function maxDailyUsd(): number {
  const raw = process.env.MAX_DAILY_LLM_USD;
  const n = Number.parseFloat(raw ?? "1.5");
  return Number.isFinite(n) && n > 0 ? n : 1.5;
}

export async function todaysCostUsd(userId: string | null): Promise<number> {
  if (!hasSupabase()) return 0;
  const supabase = await createSupabaseServerClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Scope to user when known; cap is per-user.
  let q = supabase
    .from("ai_processing_logs")
    .select("cost_usd")
    .gte("created_at", startOfDay.toISOString())
    .eq("ok", true);
  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q.returns<Array<{ cost_usd: number | null }>>();
  if (error) {
    console.error("[cost-ledger] read failed", error.message);
    return 0;
  }
  return (data ?? []).reduce((acc, r) => acc + (r.cost_usd ?? 0), 0);
}

export async function isOverDailyCap(userId: string | null): Promise<boolean> {
  const spent = await todaysCostUsd(userId);
  return spent >= maxDailyUsd();
}

type LogInput = {
  userId: string | null;
  task: string;
  model: string;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  ok: boolean;
  error?: string;
};

// Returns the inserted row id (for linking ai_feedback), or null on failure.
export async function recordLlmCall(input: LogInput): Promise<string | null> {
  if (!hasSupabase()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ai_processing_logs")
      .insert({
        user_id: input.userId,
        task: input.task,
        model: input.model,
        latency_ms: input.latencyMs ?? null,
        tokens_in: input.tokensIn ?? null,
        tokens_out: input.tokensOut ?? null,
        cost_usd: input.costUsd ?? null,
        ok: input.ok,
        error: input.error ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) {
      console.error("[cost-ledger] insert failed", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[cost-ledger] threw", (e as Error).message);
    return null;
  }
}
