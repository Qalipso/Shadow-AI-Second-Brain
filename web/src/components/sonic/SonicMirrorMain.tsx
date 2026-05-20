import {
  getSpotifyConnection,
  getSpotifyArtists,
  getSpotifyTracks,
  getLatestSnapshot,
  getMusicMeaningLabels,
  getLatestSonicReflection,
} from "@/lib/music/data";
import { SpotifyConnectCard } from "@/components/sonic/SpotifyConnectCard";
import { SpotifySyncStatus } from "@/components/sonic/SpotifySyncStatus";
import { TopArtistsPanel } from "@/components/sonic/TopArtistsPanel";
import { TopTracksPanel } from "@/components/sonic/TopTracksPanel";
import { RecentRepeatsPanel } from "@/components/sonic/RecentRepeatsPanel";
import { EmotionalLabelSelector } from "@/components/sonic/EmotionalLabelSelector";
import { SonicReflectionCard } from "@/components/sonic/SonicReflectionCard";
import { MusicMemoryPreview } from "@/components/sonic/MusicMemoryPreview";
import { SpotifyDisconnectPanel } from "@/components/sonic/SpotifyDisconnectPanel";

interface Props {
  userId: string;
  spError?: string;
  spSynced?: string;
}

export async function SonicMirrorMain({ userId, spError, spSynced }: Props) {
  const connection = await getSpotifyConnection(userId);

  // Not connected
  if (!connection || connection.status === "disconnected") {
    return <SpotifyConnectCard />;
  }

  // Error state from callback
  if (connection.status === "error" && !spSynced) {
    return <SpotifySyncStatus error={spError ?? connection.error_message ?? "unknown"} />;
  }

  // Sync in progress (sp_synced=1 set by callback redirect)
  if (spSynced) {
    return <SpotifySyncStatus />;
  }

  // Connected — load all data in parallel
  const [
    shortArtists,
    shortTracks,
    snapshot,
    labels,
    reflection,
  ] = await Promise.all([
    getSpotifyArtists(userId, "short_term"),
    getSpotifyTracks(userId, "short_term"),
    getLatestSnapshot(userId),
    getMusicMeaningLabels(userId),
    getLatestSonicReflection(userId),
  ]);

  const artistLabelCounts: Record<string, number> = {};
  const trackLabelCounts: Record<string, number> = {};
  for (const l of labels) {
    if (l.item_type === "artist") {
      artistLabelCounts[l.item_id] = (artistLabelCounts[l.item_id] ?? 0) + 1;
    } else {
      trackLabelCounts[l.item_id] = (trackLabelCounts[l.item_id] ?? 0) + 1;
    }
  }

  // No data synced yet
  const hasData = shortArtists.length > 0 || shortTracks.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl p-5 space-y-3"
          style={{
            background: "rgba(20,20,27,0.8)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--shadow-text-faint)" }}>
            Spotify Connected
          </p>
          <p className="text-[13px]" style={{ color: "var(--shadow-text-muted)" }}>
            No music data synced yet.
          </p>
          <a
            href="/api/music/spotify/sync"
            className="inline-block px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
            style={{
              background: "rgba(126,87,194,0.12)",
              border: "1px solid rgba(126,87,194,0.25)",
              color: "rgba(126,87,194,0.9)",
            }}
          >
            Sync Now
          </a>
        </div>
        <SpotifyDisconnectPanel connection={connection} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top artists */}
      {shortArtists.length > 0 && (
        <TopArtistsPanel
          artists={shortArtists}
          period="short_term"
          labelCounts={artistLabelCounts}
        />
      )}

      {/* Top tracks */}
      {shortTracks.length > 0 && (
        <TopTracksPanel
          tracks={shortTracks}
          period="short_term"
          labelCounts={trackLabelCounts}
        />
      )}

      {/* Recent repeats from snapshot */}
      {snapshot && (
        <RecentRepeatsPanel snapshot={snapshot} />
      )}

      {/* Label selector — top 5 artists + top 5 tracks */}
      <EmotionalLabelSelector
        artists={shortArtists.slice(0, 5)}
        tracks={shortTracks.slice(0, 5)}
        initialLabels={labels}
      />

      {/* Reflection */}
      <SonicReflectionCard reflection={reflection} labelCount={labels.length} />

      {/* Memory preview */}
      <MusicMemoryPreview labels={labels} />

      {/* Disconnect */}
      <SpotifyDisconnectPanel connection={connection} />
    </div>
  );
}
