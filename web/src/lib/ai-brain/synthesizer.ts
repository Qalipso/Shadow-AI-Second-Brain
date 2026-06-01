import "server-only";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLlm, hasLlm, MODELS, estimateCostUsd } from "@/lib/llm";
import { recordLlmCall } from "@/lib/cost-ledger";
import { upsertMemoryNode, createEdgeIfAbsent } from "@/lib/memory/graph";
import { generateEmbedding } from "@/lib/embeddings";
import { isJunkEntry } from "./junk-filter";
import {
  SYNTH_SYSTEM_PROMPT,
  buildSynthUserPrompt,
  SYNTH_SCHEMA_VERSION,
} from "@/ai/prompts/memory-synthesis";

// ── Output validation ─────────────────────────────────────────────────────────

const MemoryTypeEnum = z.enum([
  "profile", "episodic", "behavioral", "goal",
  "current_state", "preference", "insight", "relationship",
]);
const NodeTypeEnum = z.enum([
  "user_profile", "value", "goal", "project", "habit", "emotion",
  "event", "pattern", "risk", "preference", "person", "place",
  "decision", "insight", "current_state",
]);
const EdgeTypeEnum = z.enum([
  "supports", "blocks", "triggers", "repeats_in", "belongs_to",
  "contradicts", "strengthens", "weakens", "causes", "related_to",
]);

const SynthSchema = z.object({
  memory_items: z
    .array(
      z.object({
        memory_type: MemoryTypeEnum,
        title: z.string().min(1).max(160),
        content: z.string().min(1).max(800),
        importance: z.number().int().min(1).max(5),
        confidence: z.number().min(0).max(1),
        tags: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  nodes: z
    .array(
      z.object({
        node_type: NodeTypeEnum,
        label: z.string().min(1).max(100),
        description: z.string().max(400).nullable().optional(),
        importance: z.number().int().min(1).max(5),
      }),
    )
    .default([]),
  edges: z
    .array(
      z.object({
        from_label: z.string().min(1),
        to_label: z.string().min(1),
        edge_type: EdgeTypeEnum,
        weight: z.number().min(0).max(1).default(0.7),
      }),
    )
    .default([]),
});

export type SynthResult = {
  ok: boolean;
  processed: number;
  skipped: number;
  itemsCreated: number;
  nodesUpserted: number;
  edgesCreated: number;
  costUsd: number;
  error?: string;
};

const EMPTY: SynthResult = {
  ok: true,
  processed: 0,
  skipped: 0,
  itemsCreated: 0,
  nodesUpserted: 0,
  edgesCreated: 0,
  costUsd: 0,
};

type EntryRow = {
  id: string;
  raw_text: string;
  summary: string | null;
  entry_type: string | null;
  created_at: string;
  status: string;
};

const MAX_TOKENS = 1400;
const BATCH_LIMIT = 14;

// Map memory_type → stability descriptor stored on memory_items.
function stabilityFor(memoryType: string): string {
  if (memoryType === "current_state" || memoryType === "episodic") return "fluid";
  if (memoryType === "profile" || memoryType === "preference") return "stable";
  return "inferred";
}

/**
 * The Shadow Brain memory synthesizer.
 * - entryId provided  → incremental, single-entry mode (auto-after-capture).
 * - entryId absent     → batch mode over recent processed entries (rebuild).
 */
export async function synthesizeMemory(
  userId: string,
  opts: { entryId?: string; limit?: number } = {},
): Promise<SynthResult> {
  if (!hasSupabase() || !hasLlm()) {
    return { ...EMPTY, ok: false, error: "Supabase or LLM not configured." };
  }

  const supabase = await createSupabaseServerClient();

  // ── Idempotency: skip a single entry already synthesized ────────────────────
  if (opts.entryId) {
    const { data: existingNode } = await supabase
      .from("memory_graph_nodes")
      .select("id")
      .eq("user_id", userId)
      .eq("source_id", opts.entryId)
      .limit(1)
      .maybeSingle();
    const { data: existingItem } = await supabase
      .from("memory_items")
      .select("id")
      .eq("user_id", userId)
      .eq("source_id", opts.entryId)
      .limit(1)
      .maybeSingle();
    if (existingNode?.id || existingItem?.id) {
      return { ...EMPTY, skipped: 1 };
    }
  }

  // ── Load entries ────────────────────────────────────────────────────────────
  let query = supabase
    .from("entries")
    .select("id, raw_text, summary, entry_type, created_at, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  query = opts.entryId
    ? query.eq("id", opts.entryId)
    : query.eq("status", "processed").limit(opts.limit ?? BATCH_LIMIT);

  const { data: rows } = await query.returns<EntryRow[]>();
  const all = rows ?? [];
  const entries = all.filter((e) => !isJunkEntry(e.summary ?? e.raw_text));
  const skipped = all.length - entries.length;

  if (entries.length === 0) {
    return { ...EMPTY, skipped };
  }

  // ── LLM call ────────────────────────────────────────────────────────────────
  const openai = getLlm();
  const model = MODELS.daily_report; // gpt-4o
  const startedAt = Date.now();
  let raw = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let costUsd = 0;

  try {
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYNTH_SYSTEM_PROMPT },
        { role: "user", content: buildSynthUserPrompt(entries) },
      ],
    });
    tokensIn = resp.usage?.prompt_tokens ?? 0;
    tokensOut = resp.usage?.completion_tokens ?? 0;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);
    raw = resp.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = (e as Error).message;
    await recordLlmCall({
      userId,
      task: "memory_synthesis",
      model,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: msg,
    });
    return { ...EMPTY, ok: false, processed: entries.length, skipped, error: msg };
  }

  const latencyMs = Date.now() - startedAt;

  // ── Parse + validate ────────────────────────────────────────────────────────
  let parsed: z.infer<typeof SynthSchema>;
  try {
    parsed = SynthSchema.parse(JSON.parse(raw));
  } catch (e) {
    await recordLlmCall({
      userId,
      task: "memory_synthesis",
      model,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd,
      ok: false,
      error: `parse: ${(e as Error).message}`,
    });
    return { ...EMPTY, ok: false, processed: entries.length, skipped, costUsd, error: "Invalid synthesizer JSON." };
  }

  const sourceId = opts.entryId ?? null;
  const nowIso = new Date().toISOString();

  // ── Write memory_items ──────────────────────────────────────────────────────
  let itemsCreated = 0;
  if (parsed.memory_items.length > 0) {
    const itemRows = parsed.memory_items.map((m) => ({
      user_id: userId,
      source_type: "brain_synthesis",
      source_id: sourceId,
      title: m.title,
      content: m.content,
      memory_type: m.memory_type,
      importance: m.importance,
      stability: stabilityFor(m.memory_type),
      confidence: m.confidence,
      tags: m.tags,
    }));
    const { data: inserted, error } = await supabase
      .from("memory_items")
      .insert(itemRows)
      .select("id");
    if (!error) itemsCreated = inserted?.length ?? 0;
    else console.error("[synthesizer] memory_items insert", error.message);
  }

  // ── Write graph nodes (dedup by label) ──────────────────────────────────────
  const labelToId = new Map<string, string>();
  let nodesUpserted = 0;
  for (const n of parsed.nodes) {
    const id = await upsertMemoryNode(
      userId,
      n.label,
      n.node_type,
      { description: n.description ?? null, importance: n.importance },
      "brain_synthesis",
      sourceId ?? undefined,
    );
    if (id) {
      labelToId.set(n.label, id);
      nodesUpserted++;
    }
  }

  // ── Write graph edges (guarded) ─────────────────────────────────────────────
  let edgesCreated = 0;
  for (const e of parsed.edges) {
    const from = labelToId.get(e.from_label);
    const to = labelToId.get(e.to_label);
    if (!from || !to) continue;
    const created = await createEdgeIfAbsent(userId, from, to, e.edge_type, e.weight);
    if (created) edgesCreated++;
  }

  // ── Semantic cross-linking (Phase 2) ─────────────────────────────────────────
  // In single-entry mode, connect this entry's new nodes to nodes from past
  // entries that are semantically similar (pgvector match_entries). This builds
  // cross-time relations the per-entry LLM call can't see on its own.
  if (opts.entryId && labelToId.size > 0) {
    try {
      const text = entries[0].summary ?? entries[0].raw_text;
      const { embedding } = await generateEmbedding(text);
      const { data: similar } = await supabase.rpc("match_entries", {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_count: 6,
      });
      const simIds = ((similar ?? []) as Array<{ id: string }>)
        .map((r) => r.id)
        .filter((id) => id !== opts.entryId);
      if (simIds.length > 0) {
        const { data: relNodes } = await supabase
          .from("memory_graph_nodes")
          .select("id, source_id")
          .eq("user_id", userId)
          .in("source_id", simIds);
        const targetIds = [
          ...new Set(((relNodes ?? []) as Array<{ id: string }>).map((n) => n.id)),
        ].slice(0, 4);
        const newIds = [...labelToId.values()];
        for (const from of newIds) {
          for (const to of targetIds) {
            const created = await createEdgeIfAbsent(userId, from, to, "related_to", 0.5);
            if (created) edgesCreated++;
          }
        }
      }
    } catch {
      // Cross-linking is best-effort; never fail synthesis on it.
    }
  }

  await recordLlmCall({
    userId,
    task: "memory_synthesis",
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    ok: true,
  });

  void nowIso;
  void SYNTH_SCHEMA_VERSION;

  return {
    ok: true,
    processed: entries.length,
    skipped,
    itemsCreated,
    nodesUpserted,
    edgesCreated,
    costUsd: Number(costUsd.toFixed(6)),
  };
}
