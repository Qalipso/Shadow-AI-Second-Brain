import type { PartyMember } from "@/lib/music/profile";
import { ROLE_META } from "@/lib/music/roles";
import { VIBE_META } from "@/lib/music/vibe";
import { Card } from "@/components/Card";

function MemberCard({ member }: { member: PartyMember }) {
  const role = ROLE_META[member.role];
  const vibeColor = member.vibe ? VIBE_META[member.vibe].color : "rgba(255,255,255,0.2)";

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-2.5">
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name}
            width={40}
            height={40}
            className="rounded-full object-cover flex-shrink-0"
            style={{ border: `1px solid ${vibeColor}` }}
          />
        ) : (
          <span
            className="w-10 h-10 rounded-full flex-shrink-0"
            style={{ background: vibeColor.replace(/[\d.]+\)$/, "0.25)") }}
          />
        )}
        <div className="min-w-0">
          <p className="text-[13px] truncate" style={{ color: "var(--shadow-text)" }}>
            {member.name}
          </p>
          <span className="flex items-center gap-1">
            <span className="text-[11px] leading-none" style={{ color: vibeColor }}>
              {role.glyph}
            </span>
            <span
              className="text-[10px] font-mono uppercase tracking-[0.12em]"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              {role.label}
            </span>
          </span>
        </div>
      </div>

      <p className="text-[11px] leading-snug" style={{ color: "var(--shadow-text-muted)" }}>
        {role.unlock}
      </p>

      {member.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.labels.map((l) => (
            <span
              key={l}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(214,184,116,0.1)", color: "rgba(214,184,116,0.75)" }}
            >
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SonicParty({ party }: { party: PartyMember[] }) {
  if (party.length === 0) return null;
  return (
    <Card title="Your Party">
      <p className="text-[11px] mb-4" style={{ color: "var(--shadow-text-faint)" }}>
        The characters your top artists play — and what each one unlocks in you.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {party.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </div>
    </Card>
  );
}
