"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "connecting" | "syncing" | "done" | "error";

export function SpotifySyncStatus({ error }: { error?: string }) {
  const [phase, setPhase] = useState<Phase>(error ? "error" : "connecting");
  const router = useRouter();

  useEffect(() => {
    if (error) return;
    // Simulate connecting → syncing → done for UX
    const t1 = setTimeout(() => setPhase("syncing"), 600);
    const t2 = setTimeout(() => {
      setPhase("done");
      router.refresh();
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [error, router]);

  const ERROR_LABELS: Record<string, string> = {
    denied:            "You declined the Spotify permission.",
    state_mismatch:    "Security check failed. Please try again.",
    token_exchange_failed: "Could not get Spotify tokens. Try again.",
    spotify_unauthorized: "Spotify access was revoked. Please reconnect.",
    invalid_callback:  "Invalid callback. Please try again.",
    db_write_failed:   "Could not save connection. Please try again.",
    encrypt_failed:    "Encryption error. Check server configuration.",
  };

  const errorLabel = error ? (ERROR_LABELS[error] ?? "Something went wrong. Try again.") : null;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-6 anim-fade-in">
      {phase === "error" ? (
        <>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(172,82,101,0.12)",
              border: "1px solid rgba(172,82,101,0.2)",
            }}
          >
            <span style={{ color: "rgba(172,82,101,0.8)", fontSize: 18 }}>✕</span>
          </div>
          <div>
            <h3 className="text-[18px] font-[family-name:var(--font-fraunces)] font-light mb-2" style={{ color: "var(--shadow-text)" }}>
              Spotify connection failed.
            </h3>
            <p className="text-[12px] mb-4" style={{ color: "var(--shadow-text-muted)" }}>
              {errorLabel}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/api/music/spotify/connect"
              className="ritual-cta px-4 py-2 rounded-lg border text-[12px]"
              style={{
                background: "rgba(126,87,194,0.08)",
                borderColor: "rgba(126,87,194,0.25)",
                color: "rgba(126,87,194,0.85)",
              }}
            >
              Retry
            </a>
            <button
              disabled
              className="px-4 py-2 rounded-lg border text-[12px] opacity-35"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                color: "var(--shadow-text-muted)",
              }}
            >
              Manual Import
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Pulsing orb */}
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full sonic-orb-breathe"
              style={{
                background: "radial-gradient(circle at 38% 36%, rgba(126,87,194,0.25) 0%, rgba(9,9,15,0.95) 68%)",
                border: "1px solid rgba(126,87,194,0.18)",
              }}
            />
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] mb-2" style={{ color: "var(--shadow-text-faint)" }}>
              {phase === "done" ? "connected" : phase === "syncing" ? "importing" : "connecting"}
            </p>
            <h3
              className="text-[18px] font-[family-name:var(--font-fraunces)] font-light"
              style={{ color: "var(--shadow-text-muted)" }}
            >
              {phase === "done"
                ? "Music profile ready."
                : phase === "syncing"
                ? "Importing your listening data…"
                : "Connecting Spotify…"}
            </h3>
            {phase !== "done" && (
              <p className="text-[11px] mt-2" style={{ color: "var(--shadow-text-faint)" }}>
                {phase === "syncing"
                  ? "Fetching top artists, tracks and recent plays."
                  : "Waiting for authorization."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
