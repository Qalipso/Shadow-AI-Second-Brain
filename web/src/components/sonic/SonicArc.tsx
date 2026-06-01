import type { MusicSnapshot } from "@/types/spotify";
import { Card } from "@/components/Card";
import { dominantVibe, vibeVectorForGenres, VIBE_META, type Vibe } from "@/lib/music/vibe";

const PHASE_LABEL: Record<Vibe, string> = {
  rage: "Overload",
  flex: "Flex",
  street: "Grounding",
  melancholy: "Shadow Loop",
  focus: "Deep Focus",
  escape: "Drift",
};

interface ArcPhase {
  date: string;
  label: string;
  color: string;
  topGenre: string | null;
}

function toPhase(snapshot: MusicSnapshot): ArcPhase {
  const genres = (snapshot.dominant_genres ?? []) as string[];
  const vibe = dominantVibe(vibeVectorForGenres(genres));
  const label = vibe ? PHASE_LABEL[vibe] : "Quiet";
  const color = vibe ? VIBE_META[vibe].color : "rgba(255,255,255,0.3)";
  const date = new Date(snapshot.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return { date, label, color, topGenre: genres[0] ?? null };
}

export function SonicArc({ snapshots }: { snapshots: MusicSnapshot[] }) {
  if (snapshots.length === 0) return null;
  const phases = snapshots.map(toPhase);

  return (
    <Card title="4-Week Arc">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        How your sound state has moved over time, phase by phase.
      </p>

      <div className="flex flex-col">
        {phases.map((p, i) => (
          <div key={i} className="flex gap-3">
            {/* connector rail */}
            <div className="flex flex-col items-center">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
              />
              {i < phases.length - 1 && (
                <span className="w-px flex-1 my-1" style={{ background: "rgba(255,255,255,0.08)" }} />
              )}
            </div>
            {/* node */}
            <div className={i < phases.length - 1 ? "pb-4 min-w-0" : "min-w-0"}>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[13px] font-[family-name:var(--font-fraunces)] font-light"
                  style={{ color: "var(--shadow-text)" }}
                >
                  {p.label}
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
                  {p.date}
                </span>
              </div>
              {p.topGenre && (
                <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
                  {p.topGenre}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {phases.length === 1 && (
        <p className="text-[10px] leading-relaxed mt-2" style={{ color: "var(--shadow-text-faint)" }}>
          Your arc builds as Shadow keeps weekly snapshots. One point so far.
        </p>
      )}
    </Card>
  );
}
