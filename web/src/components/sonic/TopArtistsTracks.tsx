import type { SpotifyArtist, SpotifyTrack } from "@/types/music";
import { Card } from "@/components/Card";

function ArtistRow({ artist, rank }: { artist: SpotifyArtist; rank: number }) {
  const img = artist.images?.[0]?.url;
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-[10px] font-mono w-4 text-right flex-shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {rank}
      </span>
      {img ? (
        <img
          src={img}
          alt={artist.name}
          width={28}
          height={28}
          className="rounded-full flex-shrink-0 object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0"
          style={{ background: "rgba(126,87,194,0.2)" }}
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
      <div
        className="text-[10px]"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {artist.popularity}
      </div>
    </div>
  );
}

function TrackRow({ track, rank }: { track: SpotifyTrack; rank: number }) {
  const img = track.album?.images?.[0]?.url;
  const artist = track.artists?.[0]?.name ?? "";
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-[10px] font-mono w-4 text-right flex-shrink-0"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        {rank}
      </span>
      {img ? (
        <img
          src={img}
          alt={track.name}
          width={28}
          height={28}
          className="rounded flex-shrink-0 object-cover"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        />
      ) : (
        <div
          className="w-7 h-7 rounded flex-shrink-0"
          style={{ background: "rgba(109,123,255,0.2)" }}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ color: "var(--shadow-text)" }}>
          {track.name}
        </p>
        <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
          {artist}
        </p>
      </div>
    </div>
  );
}

export function TopArtists({
  artists,
  label = "Top Artists",
}: {
  artists: SpotifyArtist[];
  label?: string;
}) {
  const visible = artists.slice(0, 8);
  return (
    <Card title={label}>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {visible.map((a, i) => (
          <ArtistRow key={a.id} artist={a} rank={i + 1} />
        ))}
        {visible.length === 0 && (
          <p className="py-3 text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
            No data yet.
          </p>
        )}
      </div>
    </Card>
  );
}

export function TopTracks({
  tracks,
  label = "Top Tracks",
}: {
  tracks: SpotifyTrack[];
  label?: string;
}) {
  const visible = tracks.slice(0, 8);
  return (
    <Card title={label}>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {visible.map((t, i) => (
          <TrackRow key={`${t.id}-${i}`} track={t} rank={i + 1} />
        ))}
        {visible.length === 0 && (
          <p className="py-3 text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
            No data yet.
          </p>
        )}
      </div>
    </Card>
  );
}
