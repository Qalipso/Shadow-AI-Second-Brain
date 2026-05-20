import type { SpotifyTrackItem } from "@/types/spotify";
import { Card } from "@/components/Card";

function TrackRow({ track, labelCount = 0 }: { track: SpotifyTrackItem; labelCount?: number }) {
  return (
    <div
      className="flex items-center gap-3 py-2 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <span
        className="text-[10px] font-mono w-4 text-right flex-shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {track.rank}
      </span>

      {track.image_url ? (
        <img
          src={track.image_url}
          alt={track.name}
          width={30}
          height={30}
          className="rounded flex-shrink-0 object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded flex-shrink-0"
          style={{ background: "rgba(109,123,255,0.12)" }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ color: "var(--shadow-text)" }}>
          {track.name}
        </p>
        <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
          {track.artist_names.join(", ")}
        </p>
      </div>

      {labelCount > 0 && (
        <span
          className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(214,184,116,0.1)",
            color: "rgba(214,184,116,0.7)",
          }}
        >
          {labelCount}
        </span>
      )}
    </div>
  );
}

const PERIOD_LABELS = {
  short_term: "4 weeks",
  medium_term: "6 months",
  long_term: "All time",
  recent: "Recently played",
};

export function TopTracksPanel({
  tracks,
  period,
  labelCounts = {},
}: {
  tracks: SpotifyTrackItem[];
  period: "short_term" | "medium_term" | "long_term" | "recent";
  labelCounts?: Record<string, number>;
}) {
  const label = PERIOD_LABELS[period];
  const visible = tracks.slice(0, 10);

  return (
    <Card title={`Tracks · ${label}`}>
      {visible.length === 0 ? (
        <p className="py-4 text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
          No data for this period.
        </p>
      ) : (
        <div>
          {visible.map((t) => (
            <TrackRow key={t.id} track={t} labelCount={labelCounts[t.spotify_track_id] ?? 0} />
          ))}
        </div>
      )}
    </Card>
  );
}
