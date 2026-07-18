import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { draftsToInsertRows, type MemoryItemDraft } from "./memoryItemContract";

export { MEMORY_SOURCE_TYPES, type MemorySourceType, type MemoryItemDraft } from "./memoryItemContract";

// Domain-layer single write path for `memory_items` (ADR-011; architecture
// review issue #22 — 5 independent insert paths with no shared contract).
// Every caller that wants to persist a memory item goes through here; nothing
// above this module calls `supabase.from("memory_items")` directly.
export type WrittenMemoryItem = {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
};

export type WriteMemoryItemsResult = {
  written: number;
  error: string | null;
  items: WrittenMemoryItem[];
};

export async function writeMemoryItems(
  drafts: MemoryItemDraft[],
): Promise<WriteMemoryItemsResult> {
  if (!hasSupabase() || drafts.length === 0) return { written: 0, error: null, items: [] };
  const supabase = await createSupabaseServerClient();
  const rows = draftsToInsertRows(drafts);
  const { data, error } = await supabase
    .from("memory_items")
    .insert(rows)
    .select("id, title, source_type, created_at");
  if (error) {
    console.error("[memory:writeMemoryItems]", error.message);
    return { written: 0, error: error.message, items: [] };
  }
  return { written: rows.length, error: null, items: data ?? [] };
}
