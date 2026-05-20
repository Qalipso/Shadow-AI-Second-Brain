// Compact Sonic Mirror card for the Insights page
import type { MusicProfile } from "@/types/music";
import { SOUND_STATE_META, SONIC_ARCHETYPE_META } from "@/types/music";
import { Card } from "@/components/Card";
import { SonicOrbSmall } from "./SonicOrb";
import Link from "next/link";

export function SonicMirrorModule({ profile }: { profile: MusicProfile | null }) {
  if (!profile) {
    return (
      <Card
        title="Sonic Mirror"
        action={
          <Link
            href="/insights/sonic"
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "rgba(126,87,194,0.7)" }}
          >
            connect →
          </Link>
        }
      >
        <div className="flex items-center gap-4 py-2">
          {/* Placeholder orb */}
          <div
            className="w-12 h-12 rounded-full flex-shrink-0"
            style={{
              background: "radial-gradient(circle, rgba(126,87,194,0.12) 0%, transparent 70%)",
              border: "1px solid rgba(126,87,194,0.12)",
            }}
          />
          <div>
            <p className="text-[13px]" style={{ color: "var(--shadow-text-muted)" }}>
              No music profile connected yet.
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--shadow-text-faint)" }}>
              Connect Spotify to unlock your sonic mirror.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const soundState = profile.current_sound_state ?? null;
  const archetype = profile.sonic_archetype ?? null;
  const stateMeta = soundState ? SOUND_STATE_META[soundState] : null;
  const archetypeMeta = archetype ? SONIC_ARCHETYPE_META[archetype] : null;

  return (
    <Card
      title="Sonic Mirror"
      action={
        <Link
          href="/insights/sonic"
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "rgba(126,87,194,0.7)" }}
        >
          full profile →
        </Link>
      }
    >
      <div className="flex items-center gap-4">
        <SonicOrbSmall soundState={soundState} />
        <div className="flex-1 min-w-0">
          {stateMeta && (
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: stateMeta.color }}
              />
              <span className="text-[11px]" style={{ color: stateMeta.color }}>
                {stateMeta.label}
              </span>
            </div>
          )}
          {archetypeMeta && (
            <p className="text-[13px] font-[family-name:var(--font-fraunces)]" style={{ color: "var(--shadow-text)" }}>
              {archetypeMeta.label}
            </p>
          )}
          {profile.dominant_genres.length > 0 && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--shadow-text-faint)" }}>
              {profile.dominant_genres.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {profile.ai_summary && (
        <p
          className="text-[11px] mt-3 leading-relaxed italic border-t pt-3"
          style={{
            color: "var(--shadow-text-muted)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          &ldquo;{profile.ai_summary}&rdquo;
        </p>
      )}
    </Card>
  );
}
