import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemoryGraphNode, MemoryGraphEdge } from "@/types/db";

export type { MemoryGraphNode, MemoryGraphEdge };

export async function createMemoryNode(
  userId: string,
  node: Omit<MemoryGraphNode, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("memory_graph_nodes")
      .insert({ ...node, user_id: userId })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// Dedup key includes node_type (issue #24) — a later synthesis run emitting
// the same label under a different node_type now creates a distinct node
// instead of silently leaving the existing row's type stale. Backed by the
// UNIQUE (user_id, label, node_type) constraint added in
// 20260716_memory_graph_dedup.sql; real ON CONFLICT DO UPDATE instead of
// SELECT-then-INSERT, so concurrent synthesis calls for the same user can't
// race past a SELECT before either write commits.
//
// Behavior note: on conflict, source_type/source_id are now overwritten by
// the latest contributing entry (previously only data_json/updated_at were
// touched on update, leaving provenance pinned to the first contributor).
// Not requested by #24, but a genuine consequence of using upsert() —
// worth knowing before relying on source_id as "first entry that created
// this node" going forward.
export async function upsertMemoryNode(
  userId: string,
  label: string,
  nodeType: string,
  data: Record<string, unknown>,
  sourceType?: string,
  sourceId?: string,
): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("memory_graph_nodes")
      .upsert(
        {
          user_id: userId,
          label,
          node_type: nodeType,
          data_json: data,
          importance: 3,
          source_type: sourceType ?? null,
          source_id: sourceId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,label,node_type" },
      )
      .select("id")
      .single();
    if (error) {
      console.error("[memory/graph] upsertMemoryNode", error.message);
      return null;
    }
    return row?.id ?? null;
  } catch (e) {
    console.error("[memory/graph] upsertMemoryNode", (e as Error).message);
    return null;
  }
}

export async function createMemoryEdge(
  userId: string,
  edge: Omit<MemoryGraphEdge, "id" | "user_id" | "created_at">,
): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("memory_graph_edges")
      .insert({ ...edge, user_id: userId })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// Create an edge only if an identical (from,to,type) edge does not already
// exist for this user. Keeps the synthesizer idempotent across re-runs.
// Real ON CONFLICT DO NOTHING (issue #24) instead of SELECT-then-INSERT —
// backed by UNIQUE (user_id, from_node_id, to_node_id, edge_type) added in
// 20260716_memory_graph_dedup.sql. `.select("id")` after an ignored-conflict
// upsert returns zero rows, which is how we know nothing new was created.
export async function createEdgeIfAbsent(
  userId: string,
  fromNodeId: string,
  toNodeId: string,
  edgeType: string,
  weight = 0.7,
): Promise<boolean> {
  if (fromNodeId === toNodeId) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("memory_graph_edges")
      .upsert(
        {
          user_id: userId,
          from_node_id: fromNodeId,
          to_node_id: toNodeId,
          edge_type: edgeType,
          weight,
        },
        { onConflict: "user_id,from_node_id,to_node_id,edge_type", ignoreDuplicates: true },
      )
      .select("id");
    if (error) {
      console.error("[memory/graph] createEdgeIfAbsent", error.message);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.error("[memory/graph] createEdgeIfAbsent", (e as Error).message);
    return false;
  }
}

export async function getUserGraph(userId: string): Promise<{ nodes: MemoryGraphNode[]; edges: MemoryGraphEdge[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("memory_graph_nodes").select("*").eq("user_id", userId).order("importance", { ascending: false }),
      supabase.from("memory_graph_edges").select("*").eq("user_id", userId),
    ]);
    return {
      nodes: (nodesRes.data ?? []) as MemoryGraphNode[],
      edges: (edgesRes.data ?? []) as MemoryGraphEdge[],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}
