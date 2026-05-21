import Link from "next/link";
import { TOOL_LABELS, type InterventionType } from "./types";
import { BlurFade, MagicCard, TiltCard } from "@/components/fx";

const ICONS: Record<InterventionType, string> = {
  task_shatter: "M3 3l18 18M3 21L21 3", // diagonal cracks
  dopamine_menu: "M4 6h16M4 12h12M4 18h8",
  context_switch: "M3 12h13M16 6l6 6-6 6",
  interest_filter: "M4 4l8 16 8-16-8 6z",
};

const WHEN: Record<InterventionType, string> = {
  task_shatter: "Task feels heavy, vague, or emotionally loaded.",
  dopamine_menu: "Can't choose what to do next.",
  context_switch: "Transitioning between very different modes.",
  interest_filter: "Admin work feels unbearable but must get done.",
};

const EXAMPLE: Record<InterventionType, string> = {
  task_shatter: "Input: \"Update my CV\"",
  dopamine_menu: "Energy: low · Mood: scattered",
  context_switch: "Emails → landing page",
  interest_filter: "Invoices · theme: dark fantasy",
};

const ORDER: InterventionType[] = [
  "task_shatter",
  "dopamine_menu",
  "context_switch",
  "interest_filter",
];

export function InterventionGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ORDER.map((type, idx) => {
        const t = TOOL_LABELS[type];
        return (
          <BlurFade key={type} delay={idx * 0.05} y={10}>
          <TiltCard maxTilt={5} scale={1.01}>
          <MagicCard className="rounded-xl" spotlightColor="rgba(126,87,194,0.12)" spotlightSize={340}>
          <Link
            href={`/interventions/${t.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group panel-ambient accent-top-line relative p-5 overflow-hidden block"
          >
            {/* Ambient violet bloom */}
            <div
              aria-hidden
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 group-hover:opacity-50 transition-opacity duration-500"
              style={{
                background:
                  "radial-gradient(circle, rgba(126,87,194,0.35) 0%, transparent 70%)",
              }}
            />
            <div className="relative space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[rgba(126,87,194,0.08)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[var(--shadow-gold)]"
                  >
                    <path d={ICONS[type]} />
                  </svg>
                </span>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
                  Intervention
                </p>
              </div>

              <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-[var(--shadow-text)]">
                {t.name}
              </h3>
              <p className="text-sm text-[var(--shadow-text-muted)] leading-relaxed">
                {t.short}
              </p>

              <div className="pt-3 mt-1 space-y-1 relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-12 before:h-px before:bg-[rgba(255,255,255,0.05)]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)]">
                  Use when
                </p>
                <p className="text-xs text-[var(--shadow-text-muted)]">
                  {WHEN[type]}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] italic text-[var(--shadow-text-faint)]">
                  {EXAMPLE[type]}
                </p>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-gold)] opacity-80 group-hover:opacity-100">
                  Open →
                </span>
              </div>
            </div>
          </Link>
          </MagicCard>
          </TiltCard>
          </BlurFade>
        );
      })}
    </div>
  );
}
