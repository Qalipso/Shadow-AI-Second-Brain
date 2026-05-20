/**
 * EmptyState — short phrase + single CTA.
 * No illustrations. Dark premium minimal.
 */
type Props = {
  headline: string;
  sub?: string;
  cta?: { label: string; href: string };
};

export function EmptyState({ headline, sub, cta }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <p
        className="text-sm font-medium"
        style={{ color: "var(--dt-ghost)", letterSpacing: "0.02em" }}
      >
        {headline}
      </p>
      {sub && (
        <p className="text-[11px]" style={{ color: "var(--dt-fog-text)" }}>
          {sub}
        </p>
      )}
      {cta && (
        <a
          href={cta.href}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono transition-colors"
          style={{ color: "var(--accent-warm)" }}
        >
          {cta.label}
          <span aria-hidden>→</span>
        </a>
      )}
    </div>
  );
}
