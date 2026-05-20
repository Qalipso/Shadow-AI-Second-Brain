import type { MusicMeaningLabel } from "@/types/spotify";
import { LABEL_META, MUSIC_LABELS } from "@/types/spotify";
import { Card } from "@/components/Card";

export function MusicMemoryPreview({ labels }: { labels: MusicMeaningLabel[] }) {
  if (labels.length === 0) {
    return (
      <Card title="Music Memory">
        <p className="text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
          No confirmed labels yet. Tag artists and tracks below to build your music memory.
        </p>
      </Card>
    );
  }

  // Count per label
  const countByLabel = new Map<string, number>();
  for (const l of labels) {
    countByLabel.set(l.label, (countByLabel.get(l.label) ?? 0) + 1);
  }

  // Sort labels by count desc
  const sortedLabels = MUSIC_LABELS.filter((l) => countByLabel.has(l)).sort(
    (a, b) => (countByLabel.get(b) ?? 0) - (countByLabel.get(a) ?? 0),
  );

  // Group items by label (top 3 items per label)
  const itemsByLabel = new Map<string, MusicMeaningLabel[]>();
  for (const l of labels) {
    const arr = itemsByLabel.get(l.label) ?? [];
    if (arr.length < 3) arr.push(l);
    itemsByLabel.set(l.label, arr);
  }

  // Count unique items
  const uniqueItems = new Set(labels.map((l) => `${l.item_type}:${l.item_id}`)).size;

  return (
    <Card title="Music Memory">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
            {labels.length} confirmed label{labels.length !== 1 ? "s" : ""} across {uniqueItems} item{uniqueItems !== 1 ? "s" : ""}
          </p>
          <span
            className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full"
            style={{
              color: "rgba(113,179,139,0.8)",
              background: "rgba(113,179,139,0.08)",
              border: "1px solid rgba(113,179,139,0.18)",
            }}
          >
            Saved to Memory
          </span>
        </div>

        <div className="space-y-3">
          {sortedLabels.map((label) => {
            const meta = LABEL_META[label];
            const count = countByLabel.get(label) ?? 0;
            const items = itemsByLabel.get(label) ?? [];
            return (
              <div key={label}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: meta.color.replace(/[\d.]+\)$/, "0.9)") }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: "var(--shadow-text-faint)" }}
                  >
                    ×{count}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {items.map((item) => (
                    <span
                      key={`${item.item_type}:${item.item_id}`}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        color: "var(--shadow-text-muted)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {item.item_name}
                      {item.item_type === "track" && item.artist_name
                        ? ` · ${item.artist_name}`
                        : ""}
                    </span>
                  ))}
                  {count > 3 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5"
                      style={{ color: "var(--shadow-text-faint)" }}
                    >
                      +{count - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] leading-relaxed" style={{ color: "var(--shadow-text-faint)" }}>
          Labels reflect your own interpretation — Shadow never assumes meaning from listening data alone.
        </p>
      </div>
    </Card>
  );
}
