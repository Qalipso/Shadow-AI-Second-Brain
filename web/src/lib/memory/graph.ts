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
    // Check existing node by user + label
    const { data: existing } = await supabase
      .from("memory_graph_nodes")
      .select("id")
      .eq("user_id", userId)
      .eq("label", label)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("memory_graph_nodes")
        .update({ data_json: data, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      return existing.id as string;
    }

    const { data: created } = await supabase
      .from("memory_graph_nodes")
      .insert({
        user_id: userId,
        label,
        node_type: nodeType,
        data_json: data,
        importance: 3,
        source_type: sourceType ?? null,
        source_id: sourceId ?? null,
      })
      .select("id")
      .single();
    return created?.id ?? null;
  } catch {
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
    const { data: existing } = await supabase
      .from("memory_graph_edges")
      .select("id")
      .eq("user_id", userId)
      .eq("from_node_id", fromNodeId)
      .eq("to_node_id", toNodeId)
      .eq("edge_type", edgeType)
      .maybeSingle();
    if (existing?.id) return false;

    const { error } = await supabase.from("memory_graph_edges").insert({
      user_id: userId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      edge_type: edgeType,
      weight,
    });
    return !error;
  } catch {
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
