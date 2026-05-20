import type { SonicArchetype } from "@/types/music";
import { SONIC_ARCHETYPE_META } from "@/types/music";
import { Card } from "@/components/Card";

export function SonicArchetypeCard({ archetype }: { archetype: SonicArchetype }) {
  const meta = SONIC_ARCHETYPE_META[archetype];

  return (
    <Card>
      <p
        className="text-[10px] font-mono uppercase tracking-[0.25em] mb-3"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Sonic Archetype
      </p>
      <div className="flex items-start gap-4">
        <span
          className="text-[28px] leading-none flex-shrink-0 mt-0.5"
          style={{
            color: "var(--shadow-gold)",
            textShadow: "0 0 16px rgba(214,184,116,0.3)",
          }}
        >
          {meta.glyph}
        </span>
        <div>
          <h3
            className="text-[17px] font-[family-name:var(--font-fraunces)] font-light leading-tight mb-1"
            style={{ color: "var(--shadow-text)" }}
          >
            {meta.label}
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--shadow-text-muted)" }}>
            {meta.description}
          </p>
        </div>
      </div>
    </Card>
  );
}
