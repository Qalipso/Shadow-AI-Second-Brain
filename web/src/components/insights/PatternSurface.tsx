/**
 * PatternSurface — recurring themes computed from recent entries.
 * Server component. No AI calls. Pure signal extraction.
 */
import type { Entry } from "@/types/db";

type Pattern = { label: string; count: number; pct: number };

function topN<T extends string>(items: (T | null)[], n = 5): Pattern[] {
  const freq = new Map<T, number>();
  for (const item of items) {
    if (!item) continue;
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  const total = [...freq.values()].reduce((a, b) => a + b, 0);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }));
}

type Props = {
  entries: Entry[];
};

export function PatternSurface({ entries }: Props) {
  if (entries.length < 3) return null;

  const recent = entries.slice(0, 60);

  const emotions = topN(recent.map((e) => e.emotion_primary), 6);
  const types = topN(recent.map((e) => e.entry_type), 5);

  // Emotion polarity split
  const POS = new Set(["joy", "happy", "excited", "grateful", "proud", "calm", "hopeful", "motivated", "motivation", "content", "energized", "clarity"]);
  const NEG = new Set(["sad", "angry", "anxious", "frustrated", "stressed", "overwhelmed", "tired", "resistance", "avoidance", "fear", "shame", "guilt"]);

  const posCount = recent.filter((e) => e.emotion_primary && POS.has(e.emotion_primary.toLowerCase())).length;
  const negCount = recent.filter((e) => e.emotion_primary && NEG.has(e.emotion_primary.toLowerCase())).length;
  const polarityTotal = posCount + negCount;
  const posRatio = polarityTotal > 0 ? Math.round((posCount / polarityTotal) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Emotion polarity bar */}
      {posRatio !== null && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="eyebrow">Emotional tone</p>
            <span className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
              last {recent.length} entries
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${posRatio}%`,
                background: posRatio >= 60
                  ? "linear-gradient(90deg, #6FBF8A, #4da87a)"
                  : posRatio <= 40
                    ? "linear-gradient(90deg, #E36161, #c94a4a)"
                    : "linear-gradient(90deg, #C9A36A, #b88a50)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px]" style={{ color: "#6FBF8A" }}>{posCount} positive</span>
            <span className="text-[9px]" style={{ color: "#E36161" }}>{negCount} negative</span>
          </div>
        </div>
      )}

      {/* Top emotions */}
      {emotions.length > 0 && (
        <div>
          <p className="eyebrow mb-3">Top emotions</p>
          <div className="space-y-2">
            {emotions.map(({ label, count, pct }) => (
              <div key={label} className="flex items-center gap-3">
                <span
                  className="text-[11px] font-mono w-24 shrink-0 capitalize"
                  style={{ color: "var(--shadow-text-muted)" }}
                >
                  {label}
                </span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: POS.has(label.toLowerCase())
                        ? "rgba(111,191,138,0.7)"
                        : NEG.has(label.toLowerCase())
                          ? "rgba(227,97,97,0.6)"
                          : "rgba(201,163,106,0.5)",
                    }}
                  />
                </div>
                <span
                  className="text-[9px] font-mono w-6 text-right tabular-nums"
                  style={{ color: "var(--shadow-text-faint)" }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry type breakdown */}
      {types.length > 0 && (
        <div>
          <p className="eyebrow mb-3">Entry types</p>
          <div className="flex flex-wrap gap-2">
            {types.map(({ label, count, pct }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span className="uppercase tracking-wider" style={{ color: "var(--shadow-text-faint)" }}>
                  {label}
                </span>
                <span
                  className="px-1 rounded text-[9px]"
                  style={{
                    background: "rgba(201,163,106,0.1)",
                    color: "var(--accent-warm)",
                  }}
                >
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
