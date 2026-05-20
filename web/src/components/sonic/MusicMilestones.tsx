// Music milestones for the Journey page
import type { MusicProfile } from "@/types/music";
import { SONIC_ARCHETYPE_META } from "@/types/music";
import { Card } from "@/components/Card";
import Link from "next/link";

function buildMilestones(profile: MusicProfile): Array<{ label: string; value: string; color: string }> {
  const milestones: Array<{ label: string; value: string; color: string }> = [];

  if (profile.sonic_archetype) {
    const meta = SONIC_ARCHETYPE_META[profile.sonic_archetype];
    milestones.push({
      label: "Sonic Archetype",
      value: `${meta.glyph} ${meta.label}`,
      color: "rgba(214,184,116,0.75)",
    });
  }

  if (profile.exploration_score > 70) {
    milestones.push({
      label: "Sound Explorer",
      value: `${Math.round(profile.exploration_score)} genre diversity`,
      color: "rgba(109,123,255,0.75)",
    });
  }

  if (profile.repeat_score > 60) {
    milestones.push({
      label: "Ritual Cycle",
      value: "High repeat pattern detected",
      color: "rgba(126,87,194,0.75)",
    });
  }

  if (profile.focus_score > 50) {
    milestones.push({
      label: "Focus Composer",
      value: "Ambient / instrumental dominant",
      color: "rgba(113,179,139,0.70)",
    });
  }

  if (profile.dominant_genres.length > 0) {
    milestones.push({
      label: "Primary Sound",
      value: profile.dominant_genres[0],
      color: "rgba(201,163,106,0.65)",
    });
  }

  return milestones;
}

export function MusicMilestones({ profile }: { profile: MusicProfile | null }) {
  if (!profile) {
    return (
      <Card title="Music Milestones">
        <div className="flex items-center justify-between py-2">
          <p className="text-[12px]" style={{ color: "var(--shadow-text-faint)" }}>
            No music data available.
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

  const milestones = buildMilestones(profile);

  return (
    <Card
      title="Music Milestones"
      action={
        <Link
          href="/insights/sonic"
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "rgba(126,87,194,0.65)" }}
        >
          full mirror →
        </Link>
      }
    >
      {milestones.length === 0 ? (
        <p className="text-[12px] py-2" style={{ color: "var(--shadow-text-faint)" }}>
          Sync music data to reveal milestones.
        </p>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          {milestones.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <div
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{ background: m.color }}
              />
              <div>
                <p className="text-[10px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
                  {m.label}
                </p>
                <p className="text-[13px]" style={{ color: "var(--shadow-text)" }}>
                  {m.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
