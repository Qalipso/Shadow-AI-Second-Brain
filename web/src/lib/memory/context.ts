import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { searchSimilarEntries, buildMemoryBlock, type SimilarEntry } from "@/lib/rag";

// Centralized memory context builder used by all LLM endpoints.
// Returns structured context blocks ready for prompt injection.

export type TodayEntry = {
  raw_text: string;
  summary: string | null;
  entry_type: string | null;
  emotion_primary: string | null;
  emotion_intensity: number | null;
  created_at: string;
};

export type AreaScore = {
  area_name: string;
  area_slug: string;
  score: number;
  confidence: number | null;
};

export type MemoryContext = {
  similar: SimilarEntry[];
  todayEntries: TodayEntry[];
  scores: AreaScore[];
  // Formatted XML block ready to inject into any prompt.
  block: string;
};

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function buildTodayBlock(entries: TodayEntry[]): string {
  if (entries.length === 0) return "";
  const items = entries
    .map(
      (e) =>
        `  <entry time="${e.created_at}" type="${e.entry_type ?? "raw"}" emotion="${e.emotion_primary ?? "unknown"}" intensity="${e.emotion_intensity ?? "null"}">
    ${e.summary ?? e.raw_text}
  </entry>`,
    )
    .join("\n");
  return `<today_entries count="${entries.length}">\n${items}\n</today_entries>`;
}

function buildScoresBlock(scores: AreaScore[]): string {
  if (scores.length === 0) return "";
  const items = scores
    .map(
      (s) =>
        `  <area slug="${s.area_slug}" name="${s.area_name}" score="${s.score}" confidence="${s.confidence ?? "null"}" />`,
    )
    .join("\n");
  return `<life_area_scores>\n${items}\n</life_area_scores>`;
}

export async function buildMemoryContext(
  query: string,
  userId: string,
  opts: { k?: number; includeToday?: boolean; includeScores?: boolean } = {},
): Promise<MemoryContext> {
  const { k = 5, includeToday = true, includeScores = true } = opts;

  // All fetches in parallel; each is individually best-effort.
  const [similar, todayEntries, scores] = await Promise.all([
    // RAG: semantically similar past entries.
    query.length > 5
      ? searchSimilarEntries(query, userId, k).catch(() => [] as SimilarEntry[])
      : Promise.resolve([] as SimilarEntry[]),

    // Today's activity context.
    includeToday && hasSupabase()
      ? createSupabaseServerClient()
          .then((sb) =>
            sb
              .from("entries")
              .select(
                "raw_text, summary, entry_type, emotion_primary, emotion_intensity, created_at",
              )
              .eq("user_id", userId)
              .gte("created_at", todayIso())
              .order("created_at", { ascending: true })
              .limit(20),
          )
          .then((res) => (res.data ?? []) as TodayEntry[])
          .catch(() => [] as TodayEntry[])
      : Promise.resolve([] as TodayEntry[]),

    // Life area scores.
    includeScores && hasSupabase()
      ? createSupabaseServerClient()
          .then((sb) =>
            Promise.all([
              sb
                .from("life_area_scores")
                .select("life_area_id, score, confidence")
                .eq("user_id", userId)
                .gte("computed_at", todayIso())
                .order("score", { ascending: false }),
              sb.from("life_areas").select("id, slug, name"),
            ]),
          )
          .then(([scoresRes, areasRes]) => {
            const areaMap = new Map(
              (areasRes.data ?? []).map((a: { id: number; slug: string; name: string }) => [
                a.id,
                a,
              ]),
            );
            return (scoresRes.data ?? []).map(
              (s: { life_area_id: number; score: number; confidence: number | null }) => ({
                area_name: areaMap.get(s.life_area_id)?.name ?? `Area#${s.life_area_id}`,
                area_slug: areaMap.get(s.life_area_id)?.slug ?? `area_${s.life_area_id}`,
                score: s.score,
                confidence: s.confidence,
              }),
            );
          })
          .catch(() => [] as AreaScore[])
      : Promise.resolve([] as AreaScore[]),
  ]);

  // Exclude today's entries from similar (avoid circular context).
  const todayDate = new Date().toISOString().slice(0, 10);
  const pastSimilar = similar.filter((e) => !e.created_at.startsWith(todayDate));

  const parts: string[] = [];
  if (pastSimilar.length > 0) parts.push(buildMemoryBlock(pastSimilar));
  if (todayEntries.length > 0) parts.push(buildTodayBlock(todayEntries));
  if (scores.length > 0) parts.push(buildScoresBlock(scores));

  return {
    similar: pastSimilar,
    todayEntries,
    scores,
    block: parts.join("\n\n"),
  };
}
