"use client";

import { useState, useTransition } from "react";
import type { MusicLabel, MusicMeaningLabel } from "@/types/spotify";
import { MUSIC_LABELS, LABEL_META } from "@/types/spotify";
import type { SpotifyArtistItem, SpotifyTrackItem } from "@/types/spotify";
import { Card } from "@/components/Card";

type ItemForLabel =
  | { type: "artist"; item: SpotifyArtistItem }
  | { type: "track"; item: SpotifyTrackItem };

function LabelChip({
  label,
  active,
  onClick,
}: {
  label: MusicLabel;
  active: boolean;
  onClick: () => void;
}) {
  const meta = LABEL_META[label];
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-full text-[10px] font-mono transition-all"
      style={{
        background: active
          ? meta.color.replace(/[\d.]+\)$/, "0.18)")
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? meta.color.replace(/[\d.]+\)$/, "0.4)") : "rgba(255,255,255,0.08)"}`,
        color: active
          ? meta.color.replace(/[\d.]+\)$/, "0.95)")
          : "var(--shadow-text-faint)",
      }}
    >
      {label}
    </button>
  );
}

function ItemLabelRow({
  entry,
  activeLabels,
  onToggle,
}: {
  entry: ItemForLabel;
  activeLabels: Set<MusicLabel>;
  onToggle: (label: MusicLabel) => void;
}) {
  const item = entry.item;
  const name = item.name;
  const imageUrl = "image_url" in item ? item.image_url : null;
  const sub = entry.type === "artist"
    ? (item as SpotifyArtistItem).genres.slice(0, 2).join(" · ")
    : (item as SpotifyTrackItem).artist_names.join(", ");

  return (
    <div
      className="py-3 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-3 mb-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            width={28}
            height={28}
            className={entry.type === "artist" ? "rounded-full flex-shrink-0 object-cover" : "rounded flex-shrink-0 object-cover"}
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          />
        ) : (
          <div
            className={`w-7 h-7 flex-shrink-0 ${entry.type === "artist" ? "rounded-full" : "rounded"}`}
            style={{ background: "rgba(126,87,194,0.12)" }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] truncate" style={{ color: "var(--shadow-text)" }}>
            {name}
          </p>
          {sub && (
            <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
              {sub}
            </p>
          )}
        </div>
        <span
          className="text-[9px] font-mono uppercase"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          {entry.type}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MUSIC_LABELS.map((label) => (
          <LabelChip
            key={label}
            label={label}
            active={activeLabels.has(label)}
            onClick={() => onToggle(label)}
          />
        ))}
      </div>
    </div>
  );
}

export function EmotionalLabelSelector({
  artists,
  tracks,
  initialLabels,
}: {
  artists: SpotifyArtistItem[];
  tracks: SpotifyTrackItem[];
  initialLabels: MusicMeaningLabel[];
}) {
  const [, startTransition] = useTransition();

  // Build label state: Map<"artist:id" | "track:id", Set<MusicLabel>>
  const [labelMap, setLabelMap] = useState<Map<string, Set<MusicLabel>>>(() => {
    const m = new Map<string, Set<MusicLabel>>();
    for (const l of initialLabels) {
      const key = `${l.item_type}:${l.item_id}`;
      const s = m.get(key) ?? new Set<MusicLabel>();
      s.add(l.label);
      m.set(key, s);
    }
    return m;
  });

  function toggleLabel(
    itemType: "artist" | "track",
    itemId: string,
    itemName: string,
    artistName: string | undefined,
    label: MusicLabel,
  ) {
    const key = `${itemType}:${itemId}`;
    setLabelMap((prev) => {
      const next = new Map(prev);
      const s = new Set(next.get(key) ?? []);
      const isAdding = !s.has(label);
      if (isAdding) s.add(label);
      else s.delete(label);
      next.set(key, s);
      return next;
    });

    startTransition(async () => {
      if (labelMap.get(key)?.has(label) ?? false) {
        // Was active → remove
        await fetch("/api/music/labels", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_type: itemType, item_id: itemId, label }),
        });
      } else {
        // Was inactive → add
        await fetch("/api/music/labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_type: itemType,
            item_id: itemId,
            item_name: itemName,
            artist_name: artistName,
            label,
          }),
        });
      }
    });
  }

  // Show top 5 artists + top 5 tracks for labeling
  const artistEntries: ItemForLabel[] = artists.slice(0, 5).map((a) => ({ type: "artist", item: a }));
  const trackEntries: ItemForLabel[] = tracks.slice(0, 5).map((t) => ({ type: "track", item: t }));
  const entries = [...artistEntries, ...trackEntries];

  return (
    <Card title="Confirm Meaning">
      <div className="mb-4 space-y-1">
        <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
          What do these artists and tracks mean to you?
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--shadow-text-faint)" }}>
          Shadow will only use confirmed labels — never assume from listening data alone.
          Labels stay private. You can change them anytime.
        </p>
      </div>

      {entries.map((entry) => {
        const itemId = entry.type === "artist"
          ? (entry.item as SpotifyArtistItem).spotify_artist_id
          : (entry.item as SpotifyTrackItem).spotify_track_id;
        const key = `${entry.type}:${itemId}`;
        const activeLabels = labelMap.get(key) ?? new Set<MusicLabel>();
        const artistName = entry.type === "track"
          ? (entry.item as SpotifyTrackItem).artist_names[0]
          : undefined;

        return (
          <ItemLabelRow
            key={key}
            entry={entry}
            activeLabels={activeLabels}
            onToggle={(label) =>
              toggleLabel(entry.type, itemId, entry.item.name, artistName, label)
            }
          />
        );
      })}

      {entries.length === 0 && (
        <p className="py-4 text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
          Sync music data first to start labeling.
        </p>
      )}
    </Card>
  );
}
