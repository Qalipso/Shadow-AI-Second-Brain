import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-6 pb-2">
      <div>
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mt-1 text-gradient-subtle">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}
