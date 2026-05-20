import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export type DetectedGap = {
  reason: string;
  source: string;
  area: string | null;
  priority: number;
};

type ExistingGap = {
  reason: string;
  status: string;
};

type CheckinRow = {
  date: string;
  linked_goal_id: string | null;
};

type MemoryCountRow = {
  memory_type: string;
};

function isGapAlreadyKnown(reason: string, existing: ExistingGap[]): boolean {
  const normalized = reason.toLowerCase();
  return existing.some((g) => g.reason.toLowerCase().includes(normalized.slice(0, 40)));
}

function daysSinceIso(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function detectKnowledgeGaps(userId: string): Promise<DetectedGap[]> {
  if (!hasSupabase()) return [];

  const [profileRes, checkinsRes, goalsRes, memoryRes, existingGapsRes] = await Promise.all([
    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("profile_ai_summary")
          .select("last_generated_at")
          .eq("user_id", userId)
          .single(),
      )
      .catch(() => ({ data: null })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("daily_checkins")
          .select("date, linked_goal_id")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(7),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("goals")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "active"),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("memory_items")
          .select("memory_type")
          .eq("user_id", userId)
          .in("memory_type", ["profile", "behavioral"]),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("knowledge_gaps")
          .select("reason, status")
          .eq("user_id", userId)
          .neq("status", "answered"),
      )
      .catch(() => ({ data: [] })),
  ]);

  const existing = (existingGapsRes.data ?? []) as ExistingGap[];
  const checkins = (checkinsRes.data ?? []) as CheckinRow[];
  const goalsCount = (goalsRes.data ?? []).length;
  const memoryItems = (memoryRes.data ?? []) as MemoryCountRow[];
  const profileLastGenerated =
    (profileRes.data as { last_generated_at?: string | null } | null)?.last_generated_at ?? null;

  const candidates: DetectedGap[] = [];

  // Rule 1: No profile summary yet
  if (!profileLastGenerated) {
    candidates.push({
      reason: "Shadow hasn't built a personality profile yet",
      source: "profile_ai_summary",
      area: "profile",
      priority: 5,
    });
  }

  // Rule 2: Not enough stable memories
  const stableMemoryCount = memoryItems.length;
  if (stableMemoryCount < 3) {
    candidates.push({
      reason: "Shadow doesn't have enough stable memories about you yet",
      source: "memory_items",
      area: "memory",
      priority: 4,
    });
  }

  // Rule 3: No active goals
  if (goalsCount === 0) {
    candidates.push({
      reason: "Shadow doesn't know what you're working toward",
      source: "goals",
      area: "goals",
      priority: 4,
    });
  }

  // Rule 4: No checkin in 7+ days
  if (checkins.length === 0) {
    candidates.push({
      reason: "Shadow hasn't heard from you in a while and can't track patterns",
      source: "daily_checkins",
      area: "habits",
      priority: 3,
    });
  } else {
    const mostRecent = checkins[0].date;
    if (daysSinceIso(mostRecent) > 7) {
      candidates.push({
        reason: "Shadow hasn't heard from you in a while and can't track patterns",
        source: "daily_checkins",
        area: "habits",
        priority: 3,
      });
    }
  }

  // Rule 5: Checkins exist but no goal linkage
  if (
    checkins.length > 0 &&
    checkins.every((c) => c.linked_goal_id === null)
  ) {
    candidates.push({
      reason: "Shadow doesn't know which goal your daily energy goes toward",
      source: "daily_checkins",
      area: "goals",
      priority: 3,
    });
  }

  // Filter out already-known gaps and return max 3
  return candidates
    .filter((c) => !isGapAlreadyKnown(c.reason, existing))
    .slice(0, 3);
}
