"use client";

import { useState } from "react";

export function ConnectMusicProfile() {
  const [loading, setLoading] = useState<string | null>(null);

  function connectSpotify() {
    setLoading("spotify");
    window.location.href = "/api/music/connect";
  }

  return (
    <div className="flex flex-col items-center text-center px-6 py-14 anim-fade-in">
      {/* Orb */}
      <div className="relative mb-10">
        <div
          className="w-20 h-20 rounded-full sonic-orb-breathe"
          style={{
            background: "radial-gradient(circle at 38% 36%, rgba(126,87,194,0.28) 0%, rgba(9,9,15,0.92) 65%)",
            border: "1px solid rgba(126,87,194,0.18)",
            boxShadow: "0 0 48px rgba(126,87,194,0.12), inset 0 0 24px rgba(126,87,194,0.05)",
          }}
        />
        {/* Waveform bars inside orb */}
        <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-3 px-4 overflow-hidden rounded-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full flex-1"
              style={{
                background: "rgba(126,87,194,0.55)",
                minHeight: 2,
                height: `${6 + Math.sin((i / 8) * Math.PI) * 14}px`,
                animation: `sonic-wave ${0.7 + i * 0.1}s ease-in-out infinite alternate`,
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <p
        className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Sonic Mirror
      </p>

      <h1
        className="text-[22px] font-[family-name:var(--font-fraunces)] font-light mb-3 leading-snug"
        style={{ color: "var(--shadow-text)" }}
      >
        No music profile connected yet.
      </h1>

      <p
        className="text-[13px] max-w-[320px] leading-relaxed mb-10"
        style={{ color: "var(--shadow-text-muted)" }}
      >
        Connect Spotify or import your listening history.
        Shadow will turn your sound patterns into a mirror of focus, emotion and memory.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <button
          onClick={connectSpotify}
          disabled={loading === "spotify"}
          className="ritual-cta rounded-xl px-5 py-3 text-[13px] font-medium border"
          style={{
            background: "rgba(126,87,194,0.12)",
            borderColor: "rgba(126,87,194,0.3)",
            color: "var(--shadow-text)",
          }}
        >
          {loading === "spotify" ? "Connecting…" : "Connect Spotify"}
        </button>

        <button
          disabled
          className="rounded-xl px-5 py-3 text-[12px] border opacity-40 cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.07)",
            color: "var(--shadow-text-muted)",
          }}
        >
          Import Yandex Music
          <span className="ml-2 text-[10px] opacity-60">soon</span>
        </button>

        <button
          disabled
          className="rounded-xl px-5 py-3 text-[12px] border opacity-40 cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.07)",
            color: "var(--shadow-text-muted)",
          }}
        >
          Manual Import
          <span className="ml-2 text-[10px] opacity-60">soon</span>
        </button>
      </div>

      <p
        className="text-[10px] mt-8 max-w-[280px] leading-relaxed"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Shadow reads your listening history only. No audio access. No model training on your data.
        Disconnect anytime in settings.
      </p>
    </div>
  );
}
