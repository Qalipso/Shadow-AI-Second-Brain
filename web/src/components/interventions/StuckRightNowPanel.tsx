import Link from "next/link";

const BUTTONS = [
  { href: "/interventions/shatter?new=1", label: "Shatter a Task" },
  { href: "/interventions/menu?new=1",    label: "Build Dopamine Menu" },
  { href: "/interventions/switch?new=1",  label: "Switch Context" },
  { href: "/interventions/filter?new=1",  label: "Questify Boring Work" },
];

export function StuckRightNowPanel() {
  return (
    <section className="panel-ambient relative overflow-hidden p-5">
      {/* Soft violet bloom + slow particles */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 80% at 0% 0%, rgba(126,87,194,0.10) 0%, transparent 65%), radial-gradient(40% 60% at 100% 100%, rgba(214,184,116,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(1px 1px at 25% 40%, rgba(214,184,116,0.4), transparent 60%), radial-gradient(1px 1px at 70% 70%, rgba(126,87,194,0.3), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--shadow-gold)] dot-breathe" />
              <h2 className="text-[11px] uppercase tracking-[0.28em] text-[var(--shadow-text-muted)]">
                Stuck right now?
              </h2>
            </div>
            <p className="text-sm text-[var(--shadow-text-muted)] mt-2">
              Choose a small intervention.
            </p>
          </div>
          <Link
            href="/interventions"
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-gold)] shrink-0 mt-1"
          >
            All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUTTONS.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-md bg-[rgba(20,20,30,0.5)] hover:bg-[rgba(214,184,116,0.08)] hover:shadow-[0_0_18px_rgba(214,184,116,0.08)] transition-all px-3 py-2.5 flex items-center justify-between gap-2"
            >
              <span className="text-sm text-[var(--shadow-text)] group-hover:text-[var(--shadow-gold)] transition-colors">
                {b.label}
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] group-hover:text-[var(--shadow-gold)] transition-colors">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
