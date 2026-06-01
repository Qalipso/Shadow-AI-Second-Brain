"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { Entry, LifeArea, MemoryGraphNode, MemoryGraphEdge } from "@/types/db";

const MemoryGraphFlow = dynamic(
  () =>
    import("@/components/memory/MemoryGraphFlow").then(
      (m) => ({ default: m.MemoryGraphFlow }),
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-xl flex items-center justify-center"
        style={{
          height: 500,
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)] orb-pulse" />
          <span className="text-[11px] text-zinc-600 font-mono">
            Loading graph…
          </span>
        </div>
      </div>
    ),
  },
);

type Props = {
  entries: Entry[];
  areas: LifeArea[];
  graphNodes: MemoryGraphNode[];
  graphEdges: MemoryGraphEdge[];
};

export function MemoryGraphZone({ entries, areas, graphNodes, graphEdges }: Props) {
  const router = useRouter();
  const [rebuilding, setRebuilding] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const hasBrain = graphNodes.length > 0;

  async function rebuild() {
    if (rebuilding) return;
    setRebuilding(true);
    setNote(null);
    try {
      const res = await fetch("/api/brain/synthesize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        nodesUpserted?: number;
        itemsCreated?: number;
        edgesCreated?: number;
        error?: string;
      };
      if (!res.ok) {
        setNote(data.error ?? `Failed (${res.status}).`);
      } else {
        setNote(
          `+${data.nodesUpserted ?? 0} nodes · +${data.edgesCreated ?? 0} links · +${data.itemsCreated ?? 0} memories`,
        );
        router.refresh();
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div
      className="rounded-2xl px-5 py-5 space-y-4"
      style={{
        background: "rgba(255,255,255,0.018)",
        border: "1px solid var(--shadow-border)",
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow mb-0.5">Memory Graph</p>
          <p className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
            {hasBrain
              ? "Synthesized by Shadow Brain · click nodes to explore"
              : "Your captures mapped by life area · click nodes to explore"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono px-2 py-1 rounded-md"
            style={{
              background: "rgba(201,163,106,0.07)",
              border: "1px solid rgba(201,163,106,0.16)",
              color: "var(--accent-warm)",
            }}
          >
            {hasBrain
              ? `${graphNodes.length} nodes · ${graphEdges.length} links`
              : `${entries.length} nodes · ${areas.length} areas`}
          </span>
          <button
            type="button"
            onClick={rebuild}
            disabled={rebuilding}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md transition-colors disabled:opacity-40"
            style={{
              background: "rgba(126,87,194,0.10)",
              border: "1px solid rgba(126,87,194,0.25)",
              color: "rgba(126,87,194,0.9)",
            }}
          >
            <Sparkles size={11} />
            {rebuilding ? "Synthesizing…" : "Rebuild Brain"}
          </button>
        </div>
      </div>

      {note && (
        <p className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
          {note}
        </p>
      )}

      <MemoryGraphFlow
        entries={entries}
        areas={areas}
        graphNodes={graphNodes}
        graphEdges={graphEdges}
      />
    </div>
  );
}
