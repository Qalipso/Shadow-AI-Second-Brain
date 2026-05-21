"use client";
import { cn } from "@/lib/cn";

type MenuItem = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
};

export type DopamineMenuResult = {
  kind: "dopamine_menu";
  mode: string;
  appetizers: MenuItem[];
  entrees: MenuItem[];
  sides: MenuItem[];
};

function MenuItemRow({
  item,
  selected,
  onToggle,
}: {
  item: MenuItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-start gap-2.5 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={`${selected ? "Deselect" : "Select"}: ${item.title}`}
        className={cn(
          "mt-0.5 w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)]",
          selected
            ? "border-[var(--shadow-gold)] bg-[rgba(214,184,116,0.18)]"
            : "border-[var(--shadow-border)] hover:border-[rgba(180,170,220,0.30)]",
        )}
      >
        {selected && (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="rgb(214,184,116)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--shadow-text)]">{item.title}</p>
        <p className="text-[11px] text-[var(--shadow-text-muted)] mt-0.5 leading-relaxed">
          {item.description}
        </p>
      </div>
      <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--shadow-text-faint)] shrink-0 mt-0.5">
        {item.estimatedMinutes}m
      </span>
    </li>
  );
}

export function DopamineMenuView({
  result,
  selected,
  onToggle,
}: {
  result: DopamineMenuResult;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const columns = [
    { title: "5 min · Appetizers", items: result.appetizers },
    { title: "20 min · Entrées", items: result.entrees },
    { title: "10 min · Sides", items: result.sides },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[rgba(126,87,194,0.05)] p-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] mb-1">
          Mode
        </p>
        <p className="text-sm text-[var(--shadow-text)]">{result.mode}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {columns.map((col) => (
          <div key={col.title} className="rounded-lg bg-[rgba(20,20,30,0.5)] p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--shadow-text-faint)] mb-2">
              {col.title}
            </p>
            <ul>
              {col.items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggle={() => onToggle(item.id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
