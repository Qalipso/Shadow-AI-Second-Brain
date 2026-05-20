import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import type { LabsTest, LabsQuestion, LabsAnswerOption, LabsSession, LabsResult, ProfileAiSummary, MemoryItem } from "@/types/db";

// ─── Tests ─────────────────────────────────────────────────────────────────

export async function getLabsTests(): Promise<LabsTest[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_tests")
    .select("*")
    .eq("is_active", true)
    .order("id");
  if (error) { console.error("[labs:getLabsTests]", error.message); return []; }
  return (data ?? []) as LabsTest[];
}

export async function getLabsTestBySlug(slug: string): Promise<LabsTest | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_tests")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (error) return null;
  return data as LabsTest;
}

export async function getLabsQuestionsWithOptions(testId: number): Promise<
  Array<LabsQuestion & { answer_options: LabsAnswerOption[] }>
> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_questions")
    .select("*, answer_options:labs_answer_options(*)")
    .eq("test_id", testId)
    .order("order_index");
  if (error) { console.error("[labs:getLabsQuestionsWithOptions]", error.message); return []; }
  // Deduplicate questions by question_key (keep lowest id) + answer_options by value
  const seen = new Set<string>();
  const deduped = (data ?? []).filter((q) => {
    const key = `${q.test_id}:${q.question_key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((q) => {
    const seenVal = new Set<number>();
    const opts = ((q as { answer_options?: LabsAnswerOption[] }).answer_options ?? []).filter((o) => {
      if (seenVal.has(o.value)) return false;
      seenVal.add(o.value);
      return true;
    });
    return { ...q, answer_options: opts };
  });
  return deduped as Array<LabsQuestion & { answer_options: LabsAnswerOption[] }>;
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export async function createLabsSession(userId: string, testId: number, version: string): Promise<LabsSession | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_sessions")
    .insert({ user_id: userId, test_id: testId, test_version: version, status: "in_progress" })
    .select()
    .single();
  if (error) { console.error("[labs:createLabsSession]", error.message); return null; }
  return data as LabsSession;
}

export async function getLabsSession(sessionId: string, userId: string): Promise<LabsSession | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as LabsSession;
}

export async function getUserSessionsForTest(userId: string, testId: number): Promise<LabsSession[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as LabsSession[];
}

export async function getCompletedTestSlugs(userId: string): Promise<string[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("labs_sessions")
    .select("test_id, labs_tests!inner(slug)")
    .eq("user_id", userId)
    .eq("status", "completed");
  if (!data) return [];
  type Row = { test_id: unknown; labs_tests: unknown };
  return [...new Set(
    (data as Row[])
      .map((r) => {
        const t = r.labs_tests;
        if (Array.isArray(t)) return (t[0] as { slug?: string })?.slug;
        if (t && typeof t === "object") return (t as { slug?: string }).slug;
        return undefined;
      })
      .filter((s): s is string => typeof s === "string"),
  )];
}

// ─── Results ───────────────────────────────────────────────────────────────

export async function getLabsResult(sessionId: string): Promise<LabsResult | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_results")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  if (error) return null;
  return data as LabsResult;
}

export async function getLatestResultForTest(userId: string, testId: number): Promise<LabsResult | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("labs_results")
    .select("*")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as LabsResult;
}

// ─── Profile AI Summary ────────────────────────────────────────────────────

export async function getProfileAiSummary(userId: string): Promise<ProfileAiSummary | null> {
  if (!hasSupabase()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profile_ai_summary")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as ProfileAiSummary;
}

// ─── Memory Items ──────────────────────────────────────────────────────────

// embedding is stored separately via 20260521_labs_memory_vector.sql migration.
// Strip it here to stay compatible with the base table (no vector column yet).
export async function insertMemoryItems(
  items: Array<Omit<MemoryItem, "id" | "created_at" | "updated_at"> & { embedding?: unknown }>,
): Promise<void> {
  if (!hasSupabase() || items.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const rows = items.map(({ embedding: _emb, ...rest }) => rest);
  const { error } = await supabase.from("memory_items").insert(rows);
  if (error) console.error("[labs:insertMemoryItems]", error.message);
}
