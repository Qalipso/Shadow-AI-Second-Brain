import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { buildMemoryContext } from "@/lib/memory/context";

export type RecentCheckin = {
  id: string;
  date: string;
  energy: number | null;
  mood: number | null;
  mental_noise: number | null;
  body_state: number | null;
  focus: number | null;
  inbox_dump: string | null;
  today_focus: string | null;
};

export type ActiveGoal = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  deadline: string | null;
};

export type Initiative = {
  id: string;
  title: string;
  reason: string;
  suggested_action: string;
  initiative_type: string;
  priority: number;
  pattern_duration: string;
  status: string;
};

export type KnowledgeGap = {
  id: string;
  reason: string;
  source: string;
  area: string | null;
  priority: number;
  status: string;
};

export type AIQuestion = {
  id: string;
  question_text: string;
  category: string | null;
  created_at: string;
};

export type AIBrainContextPack = {
  profileSummary: string | null;
  recentCheckins: RecentCheckin[];
  activeGoals: ActiveGoal[];
  activeInitiatives: Initiative[];
  openKnowledgeGaps: KnowledgeGap[];
  pendingAIQuestion: AIQuestion | null;
  memoryBlock: string;
  contextBlock: string;
};

function buildContextBlock(pack: Omit<AIBrainContextPack, "contextBlock">): string {
  const parts: string[] = ["<ai_brain_context>"];

  if (pack.profileSummary) {
    parts.push(`  <profile_summary>\n    ${pack.profileSummary}\n  </profile_summary>`);
  }

  if (pack.recentCheckins.length > 0) {
    const rows = pack.recentCheckins
      .map(
        (c) =>
          `    <checkin date="${c.date}" energy="${c.energy ?? "?"}" mood="${c.mood ?? "?"}" mental_noise="${c.mental_noise ?? "?"}" focus="${c.focus ?? "?"}" />`,
      )
      .join("\n");
    parts.push(`  <recent_checkins count="${pack.recentCheckins.length}">\n${rows}\n  </recent_checkins>`);
  }

  if (pack.activeGoals.length > 0) {
    const rows = pack.activeGoals
      .map((g) => `    <goal title="${g.title}" progress="${g.progress}%" />`)
      .join("\n");
    parts.push(`  <active_goals>\n${rows}\n  </active_goals>`);
  }

  if (pack.activeInitiatives.length > 0) {
    const rows = pack.activeInitiatives
      .map((i) => `    <initiative title="${i.title}" priority="${i.priority}" type="${i.initiative_type}" />`)
      .join("\n");
    parts.push(`  <active_initiatives>\n${rows}\n  </active_initiatives>`);
  }

  if (pack.openKnowledgeGaps.length > 0) {
    const rows = pack.openKnowledgeGaps
      .map((g) => `    <gap area="${g.area ?? "general"}" priority="${g.priority}">${g.reason}</gap>`)
      .join("\n");
    parts.push(`  <knowledge_gaps>\n${rows}\n  </knowledge_gaps>`);
  }

  if (pack.memoryBlock) {
    parts.push(`  <memory>\n    ${pack.memoryBlock}\n  </memory>`);
  }

  parts.push("</ai_brain_context>");
  return parts.join("\n");
}

export async function buildAIBrainContext(userId: string): Promise<AIBrainContextPack> {
  if (!hasSupabase()) {
    return {
      profileSummary: null,
      recentCheckins: [],
      activeGoals: [],
      activeInitiatives: [],
      openKnowledgeGaps: [],
      pendingAIQuestion: null,
      memoryBlock: "",
      contextBlock: "",
    };
  }

  const [
    profileResult,
    checkinsResult,
    goalsResult,
    initiativesResult,
    gapsResult,
    questionsResult,
    memCtx,
  ] = await Promise.all([
    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("profile_ai_summary")
          .select("summary_text")
          .eq("user_id", userId)
          .single(),
      )
      .catch(() => ({ data: null })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("daily_checkins")
          .select("id, date, energy, mood, mental_noise, body_state, focus, inbox_dump, today_focus")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(7),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("goals")
          .select("id, title, description, progress, deadline")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(5),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("shadow_initiatives")
          .select("id, title, reason, suggested_action, initiative_type, priority, pattern_duration, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(3),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("knowledge_gaps")
          .select("id, reason, source, area, priority, status")
          .eq("user_id", userId)
          .eq("status", "open")
          .limit(3),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("ai_questions")
          .select("id, question_text, category, created_at")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1),
      )
      .catch(() => ({ data: [] })),

    buildMemoryContext("recent context", userId, { k: 3, includeToday: true, includeScores: true }).catch(
      () => ({ similar: [], todayEntries: [], scores: [], block: "" }),
    ),
  ]);

  const profileSummary =
    (profileResult.data as { summary_text?: string | null } | null)?.summary_text ?? null;

  const recentCheckins = ((checkinsResult.data ?? []) as RecentCheckin[]);
  const activeGoals = ((goalsResult.data ?? []) as ActiveGoal[]);
  const activeInitiatives = ((initiativesResult.data ?? []) as Initiative[]);
  const openKnowledgeGaps = ((gapsResult.data ?? []) as KnowledgeGap[]);

  const questionsData = (questionsResult.data ?? []) as AIQuestion[];
  const pendingAIQuestion = questionsData[0] ?? null;
  const memoryBlock = memCtx.block;

  const partial = {
    profileSummary,
    recentCheckins,
    activeGoals,
    activeInitiatives,
    openKnowledgeGaps,
    pendingAIQuestion,
    memoryBlock,
  };

  return {
    ...partial,
    contextBlock: buildContextBlock(partial),
  };
}
