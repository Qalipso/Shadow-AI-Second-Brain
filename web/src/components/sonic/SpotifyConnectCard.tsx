"use client";

import { useState } from "react";

// What data will be imported — shown before user connects
const DATA_IMPORTED = [
  "Top artists — last 4 weeks, 6 months, all time",
  "Top tracks — last 4 weeks, 6 months, all time",
  "Recently played tracks — last 50 items",
];

function PrivacyNotice() {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: "rgba(109,123,255,0.04)",
        border: "1px solid rgba(109,123,255,0.12)",
      }}
    >
      <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(109,123,255,0.65)" }}>
        What will be imported
      </p>
      <ul className="space-y-1">
        {DATA_IMPORTED.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span style={{ color: "rgba(109,123,255,0.5)", fontSize: 10, marginTop: 1 }}>◦</span>
            <span className="text-[11px]" style={{ color: "var(--shadow-text-muted)" }}>
              {item}
            </span>
          </li>
        ))}
      </ul>
      <div
        className="pt-2 mt-2 border-t text-[10px] leading-relaxed"
        style={{
          borderColor: "rgba(109,123,255,0.08)",
          color: "var(--shadow-text-faint)",
        }}
      >
        Shadow will only use this data for your personal reflection.
        No audio is accessed. Your data is not used to train any AI model.
        You can disconnect and delete it anytime.
      </div>
    </div>
  );
}

export function SpotifyConnectCard() {
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setConnecting(true);
    window.location.href = "/api/music/spotify/connect";
  }

  return (
    <div className="flex flex-col items-center text-center px-4 py-12 anim-fade-in">
      {/* Orb */}
      <div className="relative mb-10 flex items-center justify-center">
        <div
          className="w-24 h-24 rounded-full sonic-orb-breathe"
          style={{
            background: "radial-gradient(circle at 38% 36%, rgba(126,87,194,0.22) 0%, rgba(9,9,15,0.95) 68%)",
            border: "1px solid rgba(126,87,194,0.15)",
            boxShadow: "0 0 48px rgba(126,87,194,0.10), inset 0 0 24px rgba(126,87,194,0.04)",
          }}
        />
        {/* Waveform inside orb */}
        <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-4 px-5 overflow-hidden rounded-full">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-full flex-1"
              style={{
                background: "rgba(126,87,194,0.45)",
                minHeight: 2,
                height: `${5 + Math.sin((i / 9) * Math.PI) * 16}px`,
                animation: `sonic-wave ${0.65 + i * 0.09}s ease-in-out infinite alternate`,
                animationDelay: `${i * 85}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <p
        className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Sonic Mirror
      </p>

      <h1
        className="text-[22px] font-[family-name:var(--font-fraunces)] font-light mb-3 leading-snug max-w-[340px]"
        style={{ color: "var(--shadow-text)" }}
      >
        No music profile connected yet.
      </h1>

      <p
        className="text-[13px] max-w-[320px] leading-relaxed mb-8"
        style={{ color: "var(--shadow-text-muted)" }}
      >
        Connect Spotify to import your listening patterns.
        Shadow will help you turn them into a careful mirror of focus, emotion and memory.
      </p>

      {/* Privacy notice */}
      <div className="w-full max-w-[340px] mb-8 text-left">
        <PrivacyNotice />
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full max-w-[260px]">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="ritual-cta rounded-xl px-5 py-3 text-[13px] font-medium border flex items-center justify-center gap-3"
          style={{
            background: "rgba(126,87,194,0.10)",
            borderColor: "rgba(126,87,194,0.28)",
            color: "var(--shadow-text)",
            opacity: connecting ? 0.5 : 1,
          }}
        >
          {/* Spotify icon (simple circle + waveform, not the full green mark) */}
          <span style={{ fontSize: 10, color: "rgba(126,87,194,0.8)" }}>◈</span>
          {connecting ? "Connecting…" : "Connect Spotify"}
        </button>

        <button
          disabled
          className="rounded-xl px-5 py-3 text-[12px] border opacity-35 cursor-not-allowed"
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
    </div>
  );
}
