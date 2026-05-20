import type { SpotifyArtistItem } from "@/types/spotify";
import { Card } from "@/components/Card";

function ArtistRow({
  artist,
  labelCount = 0,
}: {
  artist: SpotifyArtistItem;
  labelCount?: number;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <span
        className="text-[10px] font-mono w-4 text-right flex-shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {artist.rank}
      </span>

      {artist.image_url ? (
        <img
          src={artist.image_url}
          alt={artist.name}
          width={32}
          height={32}
          className="rounded-full flex-shrink-0 object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ background: "rgba(126,87,194,0.15)" }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ color: "var(--shadow-text)" }}>
          {artist.name}
        </p>
        {artist.genres.length > 0 && (
          <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
            {artist.genres.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>

      {labelCount > 0 && (
        <span
          className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(214,184,116,0.1)",
            color: "rgba(214,184,116,0.7)",
          }}
        >
          {labelCount} label{labelCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

const PERIOD_LABELS = {
  short_term: "4 weeks",
  medium_term: "6 months",
  long_term: "All time",
};

export function TopArtistsPanel({
  artists,
  period,
  labelCounts = {},
}: {
  artists: SpotifyArtistItem[];
  period: "short_term" | "medium_term" | "long_term";
  labelCounts?: Record<string, number>;
}) {
  const label = PERIOD_LABELS[period];
  const visible = artists.slice(0, 10);

  return (
    <Card title={`Top Artists · ${label}`}>
      {visible.length === 0 ? (
        <p className="py-4 text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
          No data for this period.
        </p>
      ) : (
        <div>
          {visible.map((a) => (
            <ArtistRow key={a.id} artist={a} labelCount={labelCounts[a.spotify_artist_id] ?? 0} />
          ))}
        </div>
      )}
    </Card>
  );
}
