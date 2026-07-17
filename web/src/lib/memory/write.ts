import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemoryItem, MemoryType } from "@/types/db";

// Shared memory_items write path (issue #22) — 5 independent insert paths
// existed before this, at least 2 of which never set memory_type and
// silently fell back to the DB default ('insight'), misclassifying real
// data. memory_type is required here (not Pick'd from MemoryItem, whose
// zod .default() makes it optional there) specifically to force every
// caller to choose one instead of falling through to the DB default again.
export type MemoryItemInput = {
  source_type: string;
  title: string;
  content: string;
  memory_type: MemoryType;
} & Partial<Pick<MemoryItem, "source_id" | "importance" | "stability" | "confidence" | "tags">>;

function toRow(userId: string, input: MemoryItemInput) {
  return {
    user_id: userId,
    source_type: input.source_type,
    source_id: input.source_id ?? null,
    title: input.title,
    content: input.content,
    memory_type: input.memory_type,
    importance: input.importance ?? 3,
    stability: input.stability ?? "stable",
    confidence: input.confidence,
    tags: input.tags ?? [],
  };
}

export async function insertMemoryItem(
  userId: string,
  input: MemoryItemInput,
): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memory_items")
    .insert(toRow(userId, input))
    .select("id")
    .single();
  if (error) {
    console.error("[memory/write] insertMemoryItem", error.message);
    return null;
  }
  return data;
}

export async function insertMemoryItems(
  userId: string,
  inputs: MemoryItemInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memory_items")
    .insert(inputs.map((input) => toRow(userId, input)))
    .select("id");
  if (error) {
    console.error("[memory/write] insertMemoryItems", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
