import "server-only";
import { createSupabaseServerClient } from "./supabase/server";
import { hasSupabase } from "./supabase/env";
import { generateEmbedding } from "./embeddings";

export type SimilarEntry = {
  id: string;
  raw_text: string;
  summary: string | null;
  entry_type: string | null;
  life_area_id: number | null;
  emotion_primary: string | null;
  created_at: string;
  similarity: number;
};

// Search for semantically similar entries using pgvector cosine distance.
// Returns top-k most similar entries for a given user.
export async function searchSimilarEntries(
  text: string,
  userId: string,
  k = 5,
): Promise<SimilarEntry[]> {
  if (!hasSupabase()) return [];

  const { embedding } = await generateEmbedding(text);

  const supabase = await createSupabaseServerClient();

  // Use Supabase's RPC for vector similarity search.
  // We need to use raw SQL via rpc since the JS client doesn't support
  // vector operators natively.
  const { data, error } = await supabase.rpc("match_entries", {
    query_embedding: JSON.stringify(embedding),
    match_user_id: userId,
    match_count: k,
  });

  if (error) {
    console.error("[rag:searchSimilarEntries]", error.message);
    return [];
  }

  return (data ?? []) as SimilarEntry[];
}

// Build a memory context block for LLM prompts from similar entries.
export function buildMemoryBlock(entries: SimilarEntry[]): string {
  if (entries.length === 0) return "";

  const items = entries
    .map(
      (e, i) =>
        `  <memory rank="${i + 1}" date="${e.created_at}" type="${e.entry_type ?? "raw"}" similarity="${e.similarity.toFixed(3)}">
    ${e.summary ?? e.raw_text}
  </memory>`,
    )
    .join("\n");

  return `<past_entries count="${entries.length}">\n${items}\n</past_entries>`;
}
