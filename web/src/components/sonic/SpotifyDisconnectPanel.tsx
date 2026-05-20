"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SpotifyConnection } from "@/types/spotify";
import { Card } from "@/components/Card";

export function SpotifyDisconnectPanel({
  connection,
}: {
  connection: SpotifyConnection;
}) {
  const router = useRouter();
  const [deleteData, setDeleteData] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function disconnect() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/music/spotify/disconnect", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delete_data: deleteData }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError((d as { error?: string }).error ?? "Disconnect failed.");
          return;
        }
        router.refresh();
      } catch {
        setError("Network error.");
      }
    });
  }

  const lastSynced = connection.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card title="Spotify Connection">
      <div className="space-y-4">
        {/* Status row */}
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(113,179,139,0.9)" }}
          />
          <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
            Connected
            {connection.spotify_display_name
              ? ` as ${connection.spotify_display_name}`
              : ""}
          </p>
        </div>

        {lastSynced && (
          <p className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
            Last synced: {lastSynced}
          </p>
        )}

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="text-[11px] font-mono transition-all"
            style={{ color: "rgba(172,82,101,0.7)" }}
          >
            Disconnect Spotify
          </button>
        ) : (
          <div
            className="rounded-lg p-3 space-y-3"
            style={{
              background: "rgba(172,82,101,0.05)",
              border: "1px solid rgba(172,82,101,0.15)",
            }}
          >
            <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
              Disconnect your Spotify account?
            </p>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteData}
                onChange={(e) => setDeleteData(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-[11px] leading-relaxed" style={{ color: "var(--shadow-text-faint)" }}>
                Also delete all imported data (artists, tracks, snapshots, labels, reflections)
              </span>
            </label>

            {deleteData && (
              <p
                className="text-[10px] leading-relaxed"
                style={{ color: "rgba(172,82,101,0.8)" }}
              >
                This will permanently remove all your music data from Shadow. This cannot be undone.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={disconnect}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all disabled:opacity-50"
                style={{
                  background: "rgba(172,82,101,0.12)",
                  border: "1px solid rgba(172,82,101,0.25)",
                  color: "rgba(172,82,101,0.9)",
                }}
              >
                {isPending ? "Disconnecting…" : "Confirm Disconnect"}
              </button>
              <button
                onClick={() => { setConfirming(false); setDeleteData(false); }}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--shadow-text-faint)",
                }}
              >
                Cancel
              </button>
            </div>

            {error && (
              <p className="text-[11px]" style={{ color: "rgba(172,82,101,0.9)" }}>{error}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
