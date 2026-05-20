// Compact card for the Memory page
import type { MusicProfile } from "@/types/music";
import { SONIC_ARCHETYPE_META, SOUND_STATE_META } from "@/types/music";
import { Card } from "@/components/Card";
import Link from "next/link";

export function MusicProfileCard({ profile }: { profile: MusicProfile | null }) {
  if (!profile) {
    return (
      <Card title="Music Profile">
        <div className="flex items-center justify-between py-2">
          <p className="text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
            No music profile connected yet.
          </p>
          <Link
            href="/insights/sonic"
            className="text-[11px] font-mono px-3 py-1 rounded-lg border"
            style={{
              borderColor: "rgba(126,87,194,0.25)",
              color: "rgba(126,87,194,0.75)",
              background: "rgba(126,87,194,0.06)",
            }}
          >
            Connect
          </Link>
        </div>
      </Card>
    );
  }

  const archetype = profile.sonic_archetype;
  const soundState = profile.current_sound_state;
  const archetypeMeta = archetype ? SONIC_ARCHETYPE_META[archetype] : null;
  const stateMeta = soundState ? SOUND_STATE_META[soundState] : null;

  const topArtistNames = profile.top_artists_short.slice(0, 5).map((a) => a.name);

  return (
    <Card
      title="Music Profile"
      action={
        <Link
          href="/insights/sonic"
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "rgba(126,87,194,0.65)" }}
        >
          Sonic Mirror →
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        {/* State + Archetype */}
        <div className="flex items-center gap-3">
          {stateMeta && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px]"
              style={{
                background: stateMeta.color.replace(/[\d.]+\)$/, "0.12)"),
                color: stateMeta.color.replace(/[\d.]+\)$/, "0.9)"),
                border: `1px solid ${stateMeta.color.replace(/[\d.]+\)$/, "0.25)")}`,
              }}
            >
              {stateMeta.label}
            </span>
          )}
          {archetypeMeta && (
            <span className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
              {archetypeMeta.glyph} {archetypeMeta.label}
            </span>
          )}
        </div>

        {/* Top artists */}
        {topArtistNames.length > 0 && (
          <div>
            <p
              className="text-[9px] font-mono uppercase tracking-widest mb-1.5"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Current artists
            </p>
            <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
              {topArtistNames.join(" · ")}
            </p>
          </div>
        )}

        {/* Genres */}
        {profile.dominant_genres.length > 0 && (
          <p className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
            {profile.dominant_genres.slice(0, 4).join(" · ")}
          </p>
        )}

        {/* Provider + sync */}
        <p className="text-[10px]" style={{ color: "var(--shadow-text-faint)" }}>
          {profile.provider} ·{" "}
          {profile.last_synced_at
            ? `synced ${new Date(profile.last_synced_at).toLocaleDateString()}`
            : "never synced"}
        </p>
      </div>
    </Card>
  );
}
