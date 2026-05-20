import type { MusicSnapshot } from "@/types/spotify";
import { Card } from "@/components/Card";

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

  return (
    <Card title="Recent Repeats">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        Tracks and artists you return to. These may be emotionally significant.
      </p>

      {!hasData ? (
        <p className="text-[12px] py-2" style={{ color: "var(--shadow-text-faint)" }}>
          No repeated patterns detected yet.
        </p>
      ) : (
        <div className="space-y-4">
          {repeatedTracks.length > 0 && (
            <div>
              <p
                className="text-[9px] font-mono uppercase tracking-widest mb-2"
                style={{ color: "var(--shadow-text-faint)" }}
              >
                Repeated tracks
              </p>
              <div className="flex flex-col gap-2">
                {repeatedTracks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    {t.image_url ? (
                      <img
                        src={t.image_url}
                        alt={t.name}
                        width={28}
                        height={28}
                        className="rounded flex-shrink-0 object-cover"
                        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded flex-shrink-0"
                        style={{ background: "rgba(126,87,194,0.12)" }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] truncate" style={{ color: "var(--shadow-text)" }}>
                        {t.name}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
                        {t.artist_names.join(", ")}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-mono flex-shrink-0"
                      style={{ color: "rgba(214,184,116,0.6)" }}
                    >
                      {t.play_count}×
                    </span>
                  </div>
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
