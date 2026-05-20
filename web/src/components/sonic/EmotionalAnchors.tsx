"use client";

import { useState, useTransition } from "react";
import type { EmotionalAnchor, UserMeaning } from "@/types/music";
import { USER_MEANING_META } from "@/types/music";
import { Card } from "@/components/Card";

const MEANINGS: UserMeaning[] = ["focus","pain","power","love","nostalgia","escape","recovery","chaos"];

function AnchorRow({
  anchor,
  onLabel,
}: {
  anchor: EmotionalAnchor;
  onLabel: (id: string, meaning: UserMeaning | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = anchor.user_meaning ?? null;

  return (
    <div
      className="flex items-center gap-3 py-2 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      {anchor.album_art_url ? (
        <img
          src={anchor.album_art_url}
          alt={anchor.track_name}
          width={36}
          height={36}
          className="rounded flex-shrink-0 object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />
      ) : (
        <div
          className="w-9 h-9 rounded flex-shrink-0"
          style={{ background: "rgba(126,87,194,0.15)" }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ color: "var(--shadow-text)" }}>
          {anchor.track_name}
        </p>
        <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
          {anchor.artist_name} · {anchor.play_count}× played
        </p>
      </div>

      <div className="relative flex-shrink-0">
        {current ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="px-2 py-1 rounded-md text-[10px] font-mono"
            style={{
              background: USER_MEANING_META[current].color.replace(/[\d.]+\)$/, "0.15)"),
              border: `1px solid ${USER_MEANING_META[current].color.replace(/[\d.]+\)$/, "0.3)")}`,
              color: USER_MEANING_META[current].color.replace(/[\d.]+\)$/, "0.9)"),
            }}
          >
            {USER_MEANING_META[current].label}
          </button>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="px-2 py-1 rounded-md text-[10px] border"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              color: "var(--shadow-text-faint)",
              background: "transparent",
            }}
          >
            Label
          </button>
        )}

        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-xl p-2 flex flex-col gap-1 min-w-[110px]"
            style={{
              background: "var(--bg-elev3)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {current && (
              <button
                className="text-left px-2 py-1 rounded text-[11px] hover:bg-white/5"
                style={{ color: "var(--shadow-text-muted)" }}
                onClick={() => { onLabel(anchor.id, null); setOpen(false); }}
              >
                Clear
              </button>
            )}
            {MEANINGS.map((m) => (
              <button
                key={m}
                className="text-left px-2 py-1 rounded text-[11px] hover:bg-white/5"
                style={{ color: USER_MEANING_META[m].color.replace(/[\d.]+\)$/, "0.9)") }}
                onClick={() => { onLabel(anchor.id, m); setOpen(false); }}
              >
                {USER_MEANING_META[m].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmotionalAnchors({ initialAnchors }: { initialAnchors: EmotionalAnchor[] }) {
  const [anchors, setAnchors] = useState(initialAnchors);
  const [, startTransition] = useTransition();

  function handleLabel(id: string, meaning: UserMeaning | null) {
    setAnchors((prev) =>
      prev.map((a) => (a.id === id ? { ...a, user_meaning: meaning } : a)),
    );
    startTransition(async () => {
      await fetch("/api/music/anchors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor_id: id, user_meaning: meaning }),
      });
    });
  }

  if (!anchors.length) return null;

  return (
    <Card title="Emotional Anchors">
      <p className="text-[11px] mb-3" style={{ color: "var(--shadow-text-faint)" }}>
        Tracks you return to. Label what they carry.
      </p>
      {anchors.map((a) => (
        <AnchorRow key={a.id} anchor={a} onLabel={handleLabel} />
      ))}
    </Card>
  );
}
