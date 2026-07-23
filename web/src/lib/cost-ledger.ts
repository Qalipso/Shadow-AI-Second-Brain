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

// ---------------------------------------------------------------------------
// Atomic budget (issue #4). Accounting model:
//   1. Route reserves an estimate BEFORE the LLM call — one atomic statement
//      in Postgres (llm_reserve_budget) books it or denies at the cap, so
//      concurrent requests can no longer all slip under the cap together.
//   2. recordLlmCall settles the difference (actual − reserved) once the real
//      cost is known. Lib-internal calls that were covered by a route-level
//      reservation simply don't pass reservedUsd — the estimate stands, which
//      errs on the conservative (over-counting) side.
// Until the migration is applied the RPC is missing; reserveLlmBudget then
// falls back to the legacy non-atomic check so the app keeps working.

export const DEFAULT_RESERVE_USD = 0.05;

export type BudgetReservation = {
  allowed: boolean;
  spentUsd: number;
  capUsd: number;
  /** What was actually booked (0 when denied or when running on the fallback). */
  reservedUsd: number;
};

export async function reserveLlmBudget(
  userId: string | null,
  estimateUsd: number = DEFAULT_RESERVE_USD,
): Promise<BudgetReservation> {
  const capUsd = maxDailyUsd();
  if (!hasSupabase()) {
    return { allowed: true, spentUsd: 0, capUsd, reservedUsd: 0 };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("llm_reserve_budget", {
    p_estimate: estimateUsd,
    p_cap: capUsd,
  });
  if (error) {
    // RPC not deployed yet or transient failure → legacy check-then-act.
    console.error("[cost-ledger] reserve rpc failed, using non-atomic fallback", error.message);
    const spentUsd = await todaysCostUsd(userId);
    return { allowed: spentUsd < capUsd, spentUsd, capUsd, reservedUsd: 0 };
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; spent_usd: number | null }
    | undefined;
  const allowed = row?.allowed === true;
  return {
    allowed,
    spentUsd: Number(row?.spent_usd ?? 0),
    capUsd,
    reservedUsd: allowed ? estimateUsd : 0,
  };
}

export async function settleLlmSpend(deltaUsd: number): Promise<void> {
  if (!hasSupabase() || deltaUsd === 0) return;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("llm_settle_spend", { p_delta: deltaUsd });
    if (error) console.error("[cost-ledger] settle rpc failed", error.message);
  } catch (e) {
    console.error("[cost-ledger] settle threw", (e as Error).message);
  }
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
  /** Route-level reservation this call settles against (see reserveLlmBudget). */
  reservedUsd?: number;
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
    if (input.reservedUsd !== undefined) {
      // True-up the atomic counter: failed calls release the whole reservation.
      const actual = input.ok ? (input.costUsd ?? 0) : 0;
      await settleLlmSpend(actual - input.reservedUsd);
    }
    return data?.id ?? null;
  } catch (e) {
    console.error("[cost-ledger] threw", (e as Error).message);
    return null;
  }
}
