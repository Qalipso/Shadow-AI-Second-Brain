"use client";

import type { SoundState } from "@/types/music";
import { SOUND_STATE_META } from "@/types/music";

const STATE_COLORS: Record<SoundState, { inner: string; outer: string }> = {
  dark_focus:           { inner: "rgba(109,123,255,0.30)", outer: "rgba(109,123,255,0.12)" },
  restless_energy:      { inner: "rgba(224,178,92,0.30)",  outer: "rgba(224,178,92,0.12)"  },
  soft_recovery:        { inner: "rgba(113,179,139,0.30)", outer: "rgba(113,179,139,0.12)" },
  romantic_drift:       { inner: "rgba(201,163,106,0.28)", outer: "rgba(201,163,106,0.10)" },
  aggressive_momentum:  { inner: "rgba(172,82,101,0.32)",  outer: "rgba(172,82,101,0.14)"  },
  nostalgic_loop:       { inner: "rgba(126,87,194,0.30)",  outer: "rgba(126,87,194,0.12)"  },
  creative_chaos:       { inner: "rgba(224,178,92,0.28)",  outer: "rgba(109,123,255,0.12)" },
};

export function SonicOrb({
  soundState,
  size = 120,
}: {
  soundState?: SoundState | null;
  size?: number;
}) {
  const colors = soundState ? STATE_COLORS[soundState] : STATE_COLORS.dark_focus;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer ambient ring */}
      <div
        className="absolute inset-0 rounded-full sonic-orb-breathe"
        style={{
          background: `radial-gradient(circle, ${colors.outer} 0%, transparent 70%)`,
          transform: "scale(1.4)",
          opacity: 0.6,
        }}
      />
      {/* Main orb body */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 38% 36%, ${colors.inner} 0%, rgba(9,9,15,0.92) 65%)`,
          border: `1px solid ${colors.inner.replace(/[\d.]+\)$/, "0.22)")}`,
          boxShadow: `0 0 ${size * 0.4}px ${colors.outer}, inset 0 0 ${size * 0.25}px ${colors.inner.replace(/[\d.]+\)$/, "0.06)")}`,
        }}
      />
      {/* Waveform rings */}
      <WaveformRings color={colors.inner} size={size} />
      {/* Center glyph */}
      <div
        className="relative z-10 select-none"
        style={{
          fontSize: size * 0.22,
          color: colors.inner.replace(/[\d.]+\)$/, "0.9)"),
          textShadow: `0 0 12px ${colors.inner}`,
          fontFamily: "var(--font-fraunces), serif",
        }}
      >
        ◈
      </div>
    </div>
  );
}

function WaveformRings({ color, size }: { color: string; size: number }) {
  const bars = 12;
  return (
    <div
      className="absolute inset-0 rounded-full overflow-hidden"
      style={{ opacity: 0.35 }}
    >
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] pb-3 px-4">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="rounded-full flex-1"
            style={{
              background: color.replace(/[\d.]+\)$/, "0.8)"),
              minHeight: 2,
              height: `${8 + Math.sin((i / bars) * Math.PI) * (size * 0.12)}px`,
              animation: `sonic-wave ${0.7 + i * 0.08}s ease-in-out infinite alternate`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SonicOrbSmall({ soundState }: { soundState?: SoundState | null }) {
  return <SonicOrb soundState={soundState} size={48} />;
}
