import type { MusicSnapshot } from "@/types/spotify";
import { Card } from "@/components/Card";
import { AnchorRow, type AnchorTrack } from "@/components/sonic/AnchorRow";

type RepeatedTrack = {
  id: string;
  name: string;
  artist_names: string[];
  image_url?: string;
  play_count: number;
};

type RepeatedArtist = {
  id: string;
  name: string;
  image_url?: string;
};

export function RecentRepeatsPanel({ snapshot }: { snapshot: MusicSnapshot }) {
  const repeatedTracks = (snapshot.repeated_tracks ?? []) as RepeatedTrack[];
  const repeatedArtists = (snapshot.repeated_artists ?? []) as RepeatedArtist[];
  const hasData = repeatedTracks.length > 0 || repeatedArtists.length > 0;

  const anchors: AnchorTrack[] = repeatedTracks.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artist_names[0] ?? "Unknown",
    imageUrl: t.image_url,
    playCount: t.play_count,
  }));

  return (
    <Card title="Emotional Anchors">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        Tracks you keep returning to. Anchor them into your journal, or chase the mood.
      </p>

      {!hasData ? (
        <p className="text-[12px] py-2" style={{ color: "var(--shadow-text-faint)" }}>
          No repeated patterns detected yet.
        </p>
      ) : (
        <div className="space-y-4">
          {anchors.length > 0 && (
            <div>
              <p
                className="text-[9px] font-mono uppercase tracking-widest mb-2"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                Anchor tracks
              </p>
              <div className="flex flex-col gap-2">
                {anchors.map((t) => (
                  <AnchorRow key={t.id} track={t} />
                ))}
              </div>
            </div>
          )}

          {repeatedArtists.length > 0 && (
            <div>
              <p
                className="text-[9px] font-mono uppercase tracking-widest mb-2"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                Stable artists (short + all time)
              </p>
              <div className="flex flex-wrap gap-2">
                {repeatedArtists.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{
                      background: "rgba(126,87,194,0.08)",
                      border: "1px solid rgba(126,87,194,0.15)",
                    }}
                  >
                    {a.image_url && (
                      <img
                        src={a.image_url}
                        alt={a.name}
                        width={16}
                        height={16}
                        className="rounded-full object-cover"
                      />
                    )}
                    <span className="text-[11px]" style={{ color: "var(--shadow-text-muted)" }}>
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
