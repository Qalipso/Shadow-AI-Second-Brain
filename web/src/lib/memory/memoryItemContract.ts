import type { MemoryType } from "@/types/db";

// Pure contract for the `memory_items` domain write path (ADR-011; architecture
// review issue #22). Kept free of "server-only" so the shape/validation rules
// are unit-testable without a Supabase client — the actual write lives in
// writeMemoryItems.ts, which imports this.
//
// `sourceType` is a closed set, not a free-form string a caller can spoof
// (review issue #23) — add a new source here first, then use it.
// "inbox" is the public-API case issue #23 named directly: POST
// /api/memory/items previously accepted `source_type: z.string()` with no
// restriction at all. "brain_synthesis" is the AI synthesizer pipeline
// (lib/ai-brain/synthesizer.ts).
export const MEMORY_SOURCE_TYPES = ["intervention", "labs", "inbox", "brain_synthesis"] as const;
export type MemorySourceType = (typeof MEMORY_SOURCE_TYPES)[number];

export type MemoryItemDraft = {
  userId: string;
  sourceType: MemorySourceType;
  sourceId?: string | null;
  title: string;
  content: string;
  // Required, not defaulted: issue #22 found call sites silently relying on
  // the DB column default ('insight'), misclassifying every memory they wrote
  // under the 8-value memory_type taxonomy. Forcing an explicit value here is
  // the actual fix — a default here would just move the same bug.
  memoryType: MemoryType;
  importance: number; // 1-5, matches MemoryItemSchema (types/db.ts)
  tags: string[];
  stability?: string;
  confidence?: number | null; // set by the synthesizer; other sources omit it
};

export function draftsToInsertRows(drafts: MemoryItemDraft[]) {
  return drafts.map((d) => ({
    user_id: d.userId,
    source_type: d.sourceType,
    source_id: d.sourceId ?? null,
    title: d.title,
    content: d.content,
    memory_type: d.memoryType,
    importance: d.importance,
    stability: d.stability ?? "stable",
    tags: d.tags,
    ...(d.confidence !== undefined ? { confidence: d.confidence } : {}),
  }));
}
