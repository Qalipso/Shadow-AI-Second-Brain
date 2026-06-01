"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Entry, LifeArea, MemoryGraphNode, MemoryGraphEdge } from "@/types/db";
import { relativeTime } from "@/lib/time";

// ── Node data shape ──────────────────────────────────────────────────────────

interface NodeData extends Record<string, unknown> {
  nodeType: "center" | "area" | "entry" | "brain";
  label: string;
  color: string;
  entryCount?: number;
  entryType?: string | null;
  summary?: string | null;
  rawText?: string;
  emotionPrimary?: string | null;
  createdAt?: string;
  // brain-graph fields
  nodeId?: string; // memory_graph_nodes.id
  kind?: string; // memory_graph node_type
  description?: string | null;
  importance?: number;
  // entry enrichment
  areaLabel?: string;
  emotionIntensity?: number | null;
}

// Color per memory_graph node_type.
const NODE_TYPE_COLOR: Record<string, string> = {
  user_profile: "#C9A36A",
  value: "#B86DFF",
  goal: "#6D7BFF",
  project: "#6BB7C9",
  habit: "#C97A6A",
  emotion: "#D58CA0",
  event: "#7FA1C9",
  pattern: "#E0B25C",
  risk: "#E36161",
  preference: "#8FB46B",
  person: "#A38BFF",
  place: "#6FBF8A",
  decision: "#C9A36A",
  insight: "#E0B25C",
  current_state: "#6BB7C9",
};

function nodeKindColor(kind: string): string {
  return NODE_TYPE_COLOR[kind] ?? "#8B8BCC";
}

// ── Layout builder ───────────────────────────────────────────────────────────

function buildGraph(entries: Entry[], areas: LifeArea[]) {
  const AREA_RADIUS = 310;

  const areaById = new Map(areas.map((a) => [a.id, a]));

  // Group entries by life_area_id
  const byArea = new Map<number | null, Entry[]>();
  for (const e of entries) {
    const k = e.life_area_id ?? null;
    const arr = byArea.get(k) ?? [];
    arr.push(e);
    byArea.set(k, arr);
  }

  // Build area groups, only those with entries, sorted by count desc
  type Group = { id: string; label: string; color: string; entries: Entry[] };
  const groups: Group[] = [];

  const usedAreaIds = [...byArea.keys()].filter((k): k is number => k !== null);
  for (const areaId of usedAreaIds) {
    const area = areaById.get(areaId);
    if (!area) continue;
    groups.push({
      id: `area-${area.slug}`,
      label: area.name,
      color: area.color_hint ?? "#C9A36A",
      entries: byArea.get(areaId) ?? [],
    });
  }
  groups.sort((a, b) => b.entries.length - a.entries.length);

  const unclassified = byArea.get(null) ?? [];
  if (unclassified.length > 0) {
    groups.push({ id: "area-raw", label: "Untagged", color: "#5E5867", entries: unclassified });
  }

  const rfNodes: Node<NodeData>[] = [];
  const rfEdges: Edge[] = [];

  // Center node
  rfNodes.push({
    id: "center",
    type: "centerNode",
    position: { x: 0, y: 0 },
    data: { nodeType: "center", label: "YOU", color: "#C9A36A" },
    draggable: false,
    selectable: false,
  });

  const N = groups.length;

  groups.forEach((group, gi) => {
    // Evenly spaced around a circle, starting from top
    const angle = (gi / N) * 2 * Math.PI - Math.PI / 2;
    const ax = Math.cos(angle) * AREA_RADIUS;
    const ay = Math.sin(angle) * AREA_RADIUS;

    rfNodes.push({
      id: group.id,
      type: "areaNode",
      position: { x: ax, y: ay },
      data: {
        nodeType: "area",
        label: group.label,
        color: group.color,
        entryCount: group.entries.length,
      },
      draggable: false,
    });

    // Center → area spoke
    rfEdges.push({
      id: `ec-${group.id}`,
      source: "center",
      target: group.id,
      type: "straight",
      style: { stroke: group.color + "35", strokeWidth: 1.5 },
    });

    // Entry nodes orbiting the area hub
    const M = group.entries.length;
    const entryRadius = Math.min(160, Math.max(85, M * 20));

    group.entries.forEach((entry, ei) => {
      const eAngle = (ei / M) * 2 * Math.PI;
      rfNodes.push({
        id: entry.id,
        type: "entryNode",
        position: {
          x: ax + Math.cos(eAngle) * entryRadius,
          y: ay + Math.sin(eAngle) * entryRadius,
        },
        data: {
          nodeType: "entry",
          label: (entry.summary ?? entry.raw_text).slice(0, 80),
          color: group.color,
          entryType: entry.entry_type,
          summary: entry.summary,
          rawText: entry.raw_text,
          emotionPrimary: entry.emotion_primary,
          emotionIntensity: entry.emotion_intensity,
          areaLabel: group.label,
          createdAt: entry.created_at,
        },
        draggable: false,
      });

      rfEdges.push({
        id: `ee-${entry.id}`,
        source: entry.id,
        target: group.id,
        type: "straight",
        style: { stroke: group.color + "18", strokeWidth: 0.8 },
      });
    });
  });

  return { rfNodes, rfEdges };
}

// ── Brain graph builder (real memory_graph_nodes/edges) ──────────────────────

const EDGE_TYPE_COLOR: Record<string, string> = {
  supports: "#6FBF8A",
  strengthens: "#6FBF8A",
  blocks: "#E36161",
  weakens: "#E36161",
  contradicts: "#E36161",
  triggers: "#E0B25C",
  causes: "#E0B25C",
  repeats_in: "#6BB7C9",
  belongs_to: "#8FB46B",
  related_to: "#8B8BCC",
};

function buildBrainGraph(nodes: MemoryGraphNode[], edges: MemoryGraphEdge[]) {
  const CLUSTER_RADIUS = 360;

  // Cluster by node_type.
  const byType = new Map<string, MemoryGraphNode[]>();
  for (const n of nodes) {
    const arr = byType.get(n.node_type) ?? [];
    arr.push(n);
    byType.set(n.node_type, arr);
  }
  const types = [...byType.keys()];
  const T = Math.max(1, types.length);

  const rfNodes: Node<NodeData>[] = [];

  types.forEach((type, ti) => {
    const arr = byType.get(type) ?? [];
    const cAngle = (ti / T) * 2 * Math.PI - Math.PI / 2;
    const cx = Math.cos(cAngle) * CLUSTER_RADIUS;
    const cy = Math.sin(cAngle) * CLUSTER_RADIUS;
    const M = arr.length;
    const innerR = Math.min(150, Math.max(0, (M - 1) * 26));
    const color = nodeKindColor(type);

    arr.forEach((n, ni) => {
      const a = M === 1 ? 0 : (ni / M) * 2 * Math.PI;
      const x = M === 1 ? cx : cx + Math.cos(a) * innerR;
      const y = M === 1 ? cy : cy + Math.sin(a) * innerR;
      rfNodes.push({
        id: n.id,
        type: "brainNode",
        position: { x, y },
        data: {
          nodeType: "brain",
          label: n.label,
          color,
          nodeId: n.id,
          kind: n.node_type,
          description: n.description ?? null,
          importance: n.importance,
        },
        draggable: false,
      });
    });
  });

  const rfEdges: Edge[] = edges.map((e) => {
    const col = EDGE_TYPE_COLOR[e.edge_type] ?? "#8B8BCC";
    return {
      id: e.id,
      source: e.from_node_id,
      target: e.to_node_id,
      type: "default",
      label: e.edge_type.replace(/_/g, " "),
      labelStyle: { fill: col + "cc", fontSize: 8, fontFamily: "monospace" },
      labelBgStyle: { fill: "rgba(10,10,16,0.75)" },
      labelBgPadding: [3, 1] as [number, number],
      style: { stroke: col + "55", strokeWidth: 1 + (e.weight ?? 0.5) },
    };
  });

  return { rfNodes, rfEdges };
}

// ── Custom nodes ─────────────────────────────────────────────────────────────

function CenterNode() {
  return (
    <>
      <Handle type="source" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div className="flex flex-col items-center gap-1.5 select-none">
        <div
          className="rounded-full"
          style={{
            width: 44,
            height: 44,
            background: "radial-gradient(circle, #C9A36A 0%, #C9A36A50 65%, transparent 100%)",
            boxShadow: "0 0 28px #C9A36A55, 0 0 8px #C9A36A70",
          }}
        />
        <span
          className="text-[8px] uppercase tracking-[0.25em] font-mono"
          style={{ color: "rgba(201,163,106,0.6)" }}
        >
          you
        </span>
      </div>
    </>
  );
}

function AreaNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  const c = d.color as string;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
      <div className="flex flex-col items-center gap-1 select-none cursor-pointer">
        <div
          className="rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            width: 36,
            height: 36,
            background: c + "18",
            border: `1.5px solid ${c}${selected ? "cc" : "50"}`,
            boxShadow: selected ? `0 0 20px ${c}55` : `0 0 8px ${c}22`,
          }}
        >
          <div
            className="rounded-full"
            style={{ width: 12, height: 12, background: c, opacity: 0.85 }}
          />
        </div>
        <span
          className="text-[9px] font-medium uppercase tracking-[0.12em] whitespace-nowrap"
          style={{ color: c + "bb" }}
        >
          {d.label}
        </span>
        <span className="text-[8px] font-mono" style={{ color: c + "60" }}>
          {d.entryCount as number}
        </span>
      </div>
    </>
  );
}

function EntryNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  const c = d.color as string;
  const size = selected ? 12 : 7;
  return (
    <>
      <Handle type="source" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        className="rounded-full transition-all duration-150 cursor-pointer"
        style={{
          width: size,
          height: size,
          background: c,
          opacity: selected ? 1 : 0.55,
          boxShadow: selected ? `0 0 14px ${c}` : "none",
        }}
      />
    </>
  );
}

function BrainNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  const c = d.color as string;
  const imp = (d.importance as number) ?? 3;
  const dot = 8 + imp * 2; // 10–18 by importance
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
      <div className="flex flex-col items-center gap-1 select-none cursor-pointer">
        <div
          className="rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            width: dot + 10,
            height: dot + 10,
            background: c + "1c",
            border: `1.5px solid ${c}${selected ? "dd" : "55"}`,
            boxShadow: selected ? `0 0 18px ${c}66` : `0 0 6px ${c}22`,
          }}
        >
          <div className="rounded-full" style={{ width: dot, height: dot, background: c, opacity: 0.85 }} />
        </div>
        <span
          className="text-[8px] font-medium whitespace-nowrap max-w-[120px] truncate"
          style={{ color: c + "cc" }}
        >
          {d.label}
        </span>
      </div>
    </>
  );
}

const NODE_TYPES = {
  centerNode: CenterNode,
  areaNode: AreaNode,
  entryNode: EntryNode,
  brainNode: BrainNode,
};

// ── Detail panel ─────────────────────────────────────────────────────────────

type Relation = { label: string; type: string; dir: "in" | "out" };

function DetailPanel({
  data,
  relations,
  onClose,
}: {
  data: NodeData;
  relations?: Relation[];
  onClose: () => void;
}) {
  const c = data.color as string;
  const importance = data.importance as number | undefined;
  return (
    <div
      className="absolute bottom-4 right-4 z-20 rounded-xl px-4 py-3 w-64 max-w-[calc(100%-2rem)]"
      style={{
        background: "var(--bg-elev2)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(data.entryType || data.kind) && (
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                color: c,
                background: c + "20",
                border: `1px solid ${c}35`,
              }}
            >
              {(data.entryType as string | null) ??
                (data.kind as string).replace(/_/g, " ")}
            </span>
          )}
          {data.emotionPrimary && (
            <span className="text-[9px] text-zinc-500">
              {data.emotionPrimary as string}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          ✕
        </button>
      </div>
      {data.nodeType === "brain" && (
        <p className="text-[13px] text-zinc-200 mb-1 break-words">
          {data.label as string}
        </p>
      )}
      <p className="text-xs text-zinc-300 break-words leading-relaxed">
        {(data.summary as string | null) ??
          (data.rawText as string | undefined) ??
          (data.description as string | null) ??
          (data.label as string)}
      </p>
      {/* Entry enrichment: life area + emotion intensity */}
      {data.nodeType === "entry" && (data.areaLabel || data.emotionIntensity != null) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {data.areaLabel && (
            <span className="text-[10px] text-zinc-500">{data.areaLabel as string}</span>
          )}
          {data.emotionIntensity != null && (
            <span className="text-[10px]" style={{ color: c }}>
              intensity {data.emotionIntensity as number}/10
            </span>
          )}
        </div>
      )}

      {/* Brain node: importance + relations */}
      {importance != null && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-zinc-600">weight</span>
          <span className="font-mono text-[10px]" style={{ color: c }}>
            {"●".repeat(importance)}
            <span className="text-zinc-700">{"○".repeat(Math.max(0, 5 - importance))}</span>
          </span>
        </div>
      )}
      {relations && relations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
          {relations.map((r, i) => (
            <p key={i} className="text-[10px] text-zinc-500 truncate">
              <span style={{ color: c }}>{r.dir === "out" ? "→" : "←"}</span>{" "}
              <span className="text-zinc-600">{r.type.replace(/_/g, " ")}</span>{" "}
              <span className="text-zinc-400">{r.label}</span>
            </p>
          ))}
        </div>
      )}

      {data.createdAt && (
        <p className="text-[10px] text-zinc-600 mt-2" suppressHydrationWarning>
          {relativeTime(data.createdAt as string)}
        </p>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MemoryGraphFlow({
  entries,
  areas,
  graphNodes = [],
  graphEdges = [],
}: {
  entries: Entry[];
  areas: LifeArea[];
  graphNodes?: MemoryGraphNode[];
  graphEdges?: MemoryGraphEdge[];
}) {
  const useBrain = graphNodes.length > 0;

  const { rfNodes, rfEdges } = useMemo(
    () =>
      useBrain
        ? buildBrainGraph(graphNodes, graphEdges)
        : buildGraph(entries, areas),
    [useBrain, graphNodes, graphEdges, entries, areas],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
  const [selectedEntry, setSelectedEntry] = useState<NodeData | null>(null);

  // Re-sync when the underlying data changes (e.g. after Rebuild Brain).
  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const d = node.data as NodeData;
    if (d.nodeType === "entry" || d.nodeType === "brain") {
      setSelectedEntry(d);
    } else {
      setSelectedEntry(null);
    }
  }, []);

  const onPaneClick = useCallback(() => setSelectedEntry(null), []);

  // Adjacency for the detail panel (brain nodes only).
  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of graphNodes) m.set(n.id, n.label);
    return m;
  }, [graphNodes]);

  const selectedRelations = useMemo<Relation[]>(() => {
    const id = selectedEntry?.nodeId as string | undefined;
    if (!id) return [];
    const out: Relation[] = [];
    for (const e of graphEdges) {
      if (e.from_node_id === id)
        out.push({ label: labelById.get(e.to_node_id) ?? "?", type: e.edge_type, dir: "out" });
      else if (e.to_node_id === id)
        out.push({ label: labelById.get(e.from_node_id) ?? "?", type: e.edge_type, dir: "in" });
    }
    return out.slice(0, 8);
  }, [selectedEntry, graphEdges, labelById]);

  if (!useBrain && entries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-[11px] text-zinc-600">No entries to visualize.</p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        height: 500,
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={NODE_TYPES}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.2}
        maxZoom={3}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          style={{
            background: "rgba(18,18,28,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
          }}
        />
        <Panel position="top-left">
          <p
            className="text-[9px] font-mono uppercase tracking-[0.18em] pointer-events-none select-none"
            style={{ color: "rgba(201,163,106,0.45)" }}
          >
            {useBrain
              ? `${graphNodes.length} memory nodes · ${graphEdges.length} links · click to explore`
              : `${entries.length} captures · scroll to zoom · click dot for detail`}
          </p>
        </Panel>
      </ReactFlow>
      {selectedEntry && (
        <DetailPanel
          data={selectedEntry}
          relations={selectedRelations}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
