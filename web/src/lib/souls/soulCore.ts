import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  UserSoulStateSchema,
  SoulEventSchema,
  type UserSoulState,
  type SoulEvent,
  type SoulSourceType,
} from "@/types/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SoulCoreStatus = "empty" | "growing" | "stable" | "fading" | "critical";

export interface AwardSoulsInput {
  userId: string;
  sourceType: SoulSourceType;
  sourceId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface AwardSoulsResult {
  state: UserSoulState;
  event: SoulEvent | null;
  awarded: number;
  cappedOut: boolean;
  duplicate: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SILENCE_DAYS = 7;

// Daily/weekly caps: source_type → { cap, window }
const CAPS: Record<string, { cap: number; window: "day" | "week" }> = {
  habit_log:    { cap: 20, window: "day" },
  task:         { cap: 10, window: "day" },
  inbox:        { cap: 5,  window: "day" },
  daily_review: { cap: 5,  window: "day" },
  life_circle:  { cap: 3,  window: "day" },
  weekly_review:{ cap: 10, window: "week" },
  goal:         { cap: 10, window: "day" },
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

export function getSoulResetDeadline(state: UserSoulState): Date | null {
  if (!state.last_qualifying_activity_at) return null;
  const last = new Date(state.last_qualifying_activity_at);
  return new Date(last.getTime() + SILENCE_DAYS * 24 * 60 * 60 * 1000);
}

export function getSoulCoreStatus(state: UserSoulState): SoulCoreStatus {
  if (state.current_souls === 0 || !state.last_qualifying_activity_at) return "empty";

  const daysSince =
    (Date.now() - new Date(state.last_qualifying_activity_at).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSince < 1) return "growing";
  if (daysSince >= 6) return "critical";
  if (daysSince >= 4) return "fading";
  return "stable";
}

export function formatTimeUntilReset(deadline: Date | null): string {
  if (!deadline) return "—";
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "now";
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${totalHours}h`;
}

export function formatCycleDuration(cycleStartedAt: string | null): string {
  if (!cycleStartedAt) return "—";
  const days = Math.floor(
    (Date.now() - new Date(cycleStartedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

// ─── getSoulState (deduplicated per request via React cache) ─────────────────

export const getSoulState = cache(async (userId: string): Promise<UserSoulState | null> => {
  if (!hasSupabase()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("user_soul_state")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    const parsed = UserSoulStateSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
});

// ─── getOrCreateSoulState ────────────────────────────────────────────────────

export async function getOrCreateSoulState(userId: string): Promise<UserSoulState> {
  if (!hasSupabase()) {
    return {
      user_id: userId,
      current_souls: 0,
      lifetime_souls: 0,
      cycle_souls: 0,
      best_cycle_souls: 0,
      cycle_started_at: new Date().toISOString(),
      last_qualifying_activity_at: null,
      reset_count: 0,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("user_soul_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    const parsed = UserSoulStateSchema.safeParse(existing);
    if (parsed.success) return parsed.data;
  }

  const { data: created, error } = await supabase
    .from("user_soul_state")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !created) {
    // Race condition: another request won — fetch the winner
    const { data: retry } = await supabase
      .from("user_soul_state")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (retry) {
      const parsed = UserSoulStateSchema.safeParse(retry);
      if (parsed.success) return parsed.data;
    }
    throw new Error("[soulCore:getOrCreateSoulState] failed");
  }

  const parsed = UserSoulStateSchema.safeParse(created);
  if (!parsed.success) throw new Error("[soulCore:getOrCreateSoulState] schema mismatch");
  return parsed.data;
}

// ─── checkSoulSilenceReset ───────────────────────────────────────────────────

export async function checkSoulSilenceReset(userId: string): Promise<UserSoulState> {
  const state = await getOrCreateSoulState(userId);

  if (!state.last_qualifying_activity_at) return state;

  const daysSince =
    (Date.now() - new Date(state.last_qualifying_activity_at).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSince < SILENCE_DAYS) return state;

  // Nothing to reset
  if (state.current_souls === 0 && state.cycle_souls === 0) return state;

  const supabase = await createSupabaseServerClient();

  await supabase.from("soul_events").insert({
    user_id: userId,
    event_type: "reset",
    source_type: null,
    source_id: null,
    amount: 0,
    reason: "7_days_without_qualifying_activity",
    metadata: {
      reset_from: state.current_souls,
      cycle_souls: state.cycle_souls,
      cycle_started_at: state.cycle_started_at,
    },
  });

  const { data: updated } = await supabase
    .from("user_soul_state")
    .update({
      current_souls: 0,
      cycle_souls: 0,
      cycle_started_at: new Date().toISOString(),
      reset_count: state.reset_count + 1,
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updated) {
    const parsed = UserSoulStateSchema.safeParse(updated);
    if (parsed.success) return parsed.data;
  }

  return { ...state, current_souls: 0, cycle_souls: 0, reset_count: state.reset_count + 1 };
}

// ─── awardSouls ──────────────────────────────────────────────────────────────

export async function awardSouls(input: AwardSoulsInput): Promise<AwardSoulsResult> {
  if (!hasSupabase() || input.amount <= 0) {
    const fallback = await getOrCreateSoulState(input.userId);
    return { state: fallback, event: null, awarded: 0, cappedOut: false, duplicate: false };
  }

  const supabase = await createSupabaseServerClient();

  // 1+2. Get/create state and check silence reset
  const state = await checkSoulSilenceReset(input.userId);

  // 3. Idempotency check
  const { data: existingEvent } = await supabase
    .from("soul_events")
    .select("id")
    .eq("user_id", input.userId)
    .eq("source_type", input.sourceType)
    .eq("source_id", input.sourceId)
    .single();

  if (existingEvent) {
    return { state, event: null, awarded: 0, cappedOut: false, duplicate: true };
  }

  // 4. Daily/weekly cap check
  const capConfig = CAPS[input.sourceType];
  let effectiveAmount = input.amount;

  if (capConfig) {
    const windowStart = new Date();
    if (capConfig.window === "day") {
      windowStart.setHours(0, 0, 0, 0);
    } else {
      windowStart.setDate(windowStart.getDate() - 7);
      windowStart.setHours(0, 0, 0, 0);
    }

    const { data: capRows } = await supabase
      .from("soul_events")
      .select("amount")
      .eq("user_id", input.userId)
      .eq("source_type", input.sourceType)
      .eq("event_type", "award")
      .gte("occurred_at", windowStart.toISOString());

    const alreadyAwarded = (capRows ?? []).reduce(
      (sum: number, r: { amount: number }) => sum + r.amount,
      0,
    );

    if (alreadyAwarded >= capConfig.cap) {
      return { state, event: null, awarded: 0, cappedOut: true, duplicate: false };
    }

    effectiveAmount = Math.min(effectiveAmount, capConfig.cap - alreadyAwarded);
  }

  // 5. Insert soul_event
  const { data: eventRow, error: eventErr } = await supabase
    .from("soul_events")
    .insert({
      user_id: input.userId,
      event_type: "award",
      source_type: input.sourceType,
      source_id: input.sourceId,
      amount: effectiveAmount,
      reason: input.reason,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (eventErr) {
    // Unique constraint violation = duplicate (race condition)
    if (eventErr.code === "23505") {
      return { state, event: null, awarded: 0, cappedOut: false, duplicate: true };
    }
    console.error("[soulCore:awardSouls] insert failed", eventErr.message);
    return { state, event: null, awarded: 0, cappedOut: false, duplicate: false };
  }

  // 6. Update soul state
  const newCycleSouls = state.cycle_souls + effectiveAmount;

  const { data: updatedState } = await supabase
    .from("user_soul_state")
    .update({
      current_souls: state.current_souls + effectiveAmount,
      lifetime_souls: state.lifetime_souls + effectiveAmount,
      cycle_souls: newCycleSouls,
      best_cycle_souls: Math.max(state.best_cycle_souls, newCycleSouls),
      last_qualifying_activity_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .select("*")
    .single();

  const finalState = updatedState
    ? (UserSoulStateSchema.safeParse(updatedState).data ?? state)
    : state;

  const event = eventRow ? (SoulEventSchema.safeParse(eventRow).data ?? null) : null;

  return { state: finalState, event, awarded: effectiveAmount, cappedOut: false, duplicate: false };
}

// ─── getSoulEvents ───────────────────────────────────────────────────────────

export async function getSoulEvents(userId: string, limit = 20): Promise<SoulEvent[]> {
  if (!hasSupabase()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("soul_events")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    return (data ?? [])
      .map((r: unknown) => SoulEventSchema.safeParse(r))
      .filter((p): p is { success: true; data: SoulEvent } => p.success)
      .map((p) => p.data);
  } catch {
    return [];
  }
}
