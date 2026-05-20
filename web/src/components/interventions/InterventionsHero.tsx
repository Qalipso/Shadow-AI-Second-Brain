import { BlurFade, Particles, SparklesText } from "@/components/fx";

export function InterventionsHero() {
  return (
    <section className="panel-bloom relative overflow-hidden rounded-2xl px-6 py-10 md:py-14">
      {/* Ambient bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 0%, rgba(126,87,194,0.18) 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, rgba(68,91,140,0.12) 0%, transparent 65%), radial-gradient(30% 40% at 50% 50%, rgba(214,184,116,0.05) 0%, transparent 80%)",
        }}
      />
      {/* Live drift particles (canvas) */}
      <Particles count={22} color="214 184 116" maxOpacity={0.32} speed={0.08} />

      <div className="relative max-w-2xl">
        <BlurFade delay={0.05}>
          <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--shadow-text-faint)]">
            Cognitive reset chamber
          </p>
        </BlurFade>
        <BlurFade delay={0.12}>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-5xl mt-2 text-gradient-subtle">
            <SparklesText count={5}>Shadow Interventions</SparklesText>
          </h1>
        </BlurFade>
        <BlurFade delay={0.2}>
          <p className="mt-3 text-[var(--shadow-text-muted)] leading-relaxed">
            Move from friction into action through small intelligent rituals.
          </p>
        </BlurFade>
        <BlurFade delay={0.28}>
          <p className="mt-2 text-sm text-[var(--shadow-text-faint)] leading-relaxed max-w-xl">
            Four calm tools for when you feel stuck, overwhelmed, bored, or unable
            to switch context. Pick one. Shadow will give you a single first move.
          </p>
        </BlurFade>
      </div>
    </section>
  );
}
