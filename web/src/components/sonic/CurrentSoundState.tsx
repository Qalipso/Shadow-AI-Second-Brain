import type { SoundState } from "@/types/music";
import { SOUND_STATE_META } from "@/types/music";
import { Card } from "@/components/Card";

export function CurrentSoundState({ state }: { state: SoundState }) {
  const meta = SOUND_STATE_META[state];

  return (
    <Card>
      <div className="flex items-center gap-4">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: meta.color,
            boxShadow: `0 0 10px ${meta.color}`,
          }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-mono uppercase tracking-[0.25em] mb-1"
            style={{ color: "var(--shadow-text-faint)" }}
          >
            Current Sound State
          </p>
          <h3
            className="text-[18px] font-[family-name:var(--font-fraunces)] font-light leading-tight"
            style={{ color: "var(--shadow-text)" }}
          >
            {meta.label}
          </h3>
          <p className="text-[12px] mt-1" style={{ color: "var(--shadow-text-muted)" }}>
            {meta.description}
          </p>
        </div>
      </div>
    </Card>
  );
}
