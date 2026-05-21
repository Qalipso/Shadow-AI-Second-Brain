"use client";

import type { ReactNode } from "react";
import { LIFE_AREAS, STATUS_COLOR, type LifeAreaSlug } from "./constants";

// ─── Header ────────────────────────────────────────────────────────────────

export function DrawerHeader({
  eyebrow,
  title,
  statusValue,
  statusLabel,
  typeLabel,
  lifeAreas,
  updatedAt,
  onClose,
  onTitleChange,
  editing,
}: {
  eyebrow: string;
  title: string;
  statusValue?: string;
  statusLabel?: string;
  typeLabel?: string | null;
  lifeAreas?: string[];
  updatedAt?: string;
  onClose: () => void;
  onTitleChange?: (next: string) => void;
  editing?: boolean;
}) {
  const sColor = statusValue ? STATUS_COLOR[statusValue] ?? "var(--shadow-text-faint)" : undefined;
  return (
    <div
      className="px-6 pt-5 pb-4 border-b"
      style={{ borderColor: "var(--shadow-border)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.28em]"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          {eyebrow}
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] transition-all"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--shadow-border)",
            color: "var(--shadow-text-muted)",
          }}
        >
          ×
        </button>
      </div>

      {editing && onTitleChange ? (
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent outline-none text-[22px] leading-tight font-[family-name:var(--font-fraunces)] font-light mb-3"
          style={{ color: "var(--shadow-text)" }}
        />
      ) : (
        <h2
          className="text-[22px] leading-tight font-[family-name:var(--font-fraunces)] font-light mb-3"
          style={{ color: "var(--shadow-text)" }}
        >
          {title || "Untitled"}
        </h2>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
        {statusLabel && sColor && (
          <span
            className="px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${sColor}`,
              color: sColor,
            }}
          >
            {statusLabel}
          </span>
        )}
        {typeLabel && (
          <span
            className="px-2 py-0.5 rounded-full capitalize"
            style={{
              background: "rgba(109,123,255,0.08)",
              border: "1px solid rgba(109,123,255,0.22)",
              color: "rgba(155,165,255,0.9)",
            }}
          >
            {typeLabel}
          </span>
        )}
        {(lifeAreas ?? []).slice(0, 5).map((a) => (
          <span
            key={a}
            className="px-1.5 py-0.5 rounded text-[9px] capitalize"
            style={{
              background: "rgba(201,163,106,0.08)",
              color: "rgba(201,163,106,0.78)",
            }}
          >
            {a}
          </span>
        ))}
        {updatedAt && (
          <span style={{ color: "var(--shadow-text-faint)" }}>
            · updated {formatStamp(updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatStamp(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) return "—";
  const diff = Date.now() - d.valueOf();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Tab Bar ───────────────────────────────────────────────────────────────

export function DrawerTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto scrollbar-hide"
      style={{ borderColor: "var(--shadow-border)" }}
    >
      {tabs.map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="px-3 py-1.5 rounded-md text-[11px] font-mono transition-all whitespace-nowrap"
            style={
              active
                ? {
                    background: "rgba(201,163,106,0.10)",
                    color: "var(--accent-warm)",
                    border: "1px solid rgba(201,163,106,0.22)",
                  }
                : {
                    color: "var(--shadow-text-faint)",
                    border: "1px solid transparent",
                  }
            }
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

// ─── Field building blocks ────────────────────────────────────────────────

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="block text-[10px] font-mono uppercase tracking-[0.22em] mb-1.5"
      style={{ color: "var(--shadow-text-faint)" }}
    >
      {children}
    </label>
  );
}

export function TextField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md text-[13px] outline-none transition-all field-focus"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--shadow-border)",
          color: "var(--shadow-text)",
        }}
      />
    </div>
  );
}

export function TextArea({
  label, value, onChange, rows = 4, placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md text-[13px] leading-relaxed outline-none resize-y transition-all field-focus"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--shadow-border)",
          color: "var(--shadow-text)",
        }}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label, value, onChange, options, allowEmpty,
}: {
  label: string;
  value: T | null;
  onChange: (next: T | null) => void;
  options: { value: T; label: string }[];
  allowEmpty?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {allowEmpty && (
          <Chip
            label="—"
            active={value === null}
            onClick={() => onChange(null)}
          />
        )}
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            active={value === o.value}
            onClick={() => onChange(o.value)}
          />
        ))}
      </div>
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-all"
      style={
        active
          ? {
              background: "rgba(201,163,106,0.14)",
              border: "1px solid rgba(201,163,106,0.32)",
              color: "var(--accent-warm)",
            }
          : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--shadow-border)",
              color: "var(--shadow-text-faint)",
            }
      }
    >
      {label}
    </button>
  );
}

export function LifeAreasPicker({
  value, onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(a: LifeAreaSlug) {
    if (value.includes(a)) onChange(value.filter((x) => x !== a));
    else onChange([...value, a]);
  }
  return (
    <div>
      <FieldLabel>Linked Life Areas</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {LIFE_AREAS.map((a) => (
          <Chip
            key={a}
            label={a}
            active={value.includes(a)}
            onClick={() => toggle(a)}
          />
        ))}
      </div>
    </div>
  );
}

export function ScaleField({
  label, value, onChange, max = 10,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  max?: number;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(null)}
          className="px-1.5 py-1 rounded text-[10px] font-mono transition-all"
          style={{
            color: value === null ? "var(--accent-warm)" : "var(--shadow-text-faint)",
            background: value === null ? "rgba(201,163,106,0.08)" : "transparent",
          }}
        >
          —
        </button>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="w-6 h-6 rounded-md text-[10px] font-mono tabular-nums transition-all"
              style={{
                background: active ? "rgba(201,163,106,0.14)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${active ? "rgba(201,163,106,0.36)" : "var(--shadow-border)"}`,
                color: active ? "var(--accent-warm)" : "var(--shadow-text-faint)",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressField({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[color:var(--accent-warm)]"
        />
        <span
          className="text-[11px] font-mono tabular-nums w-10 text-right"
          style={{ color: "var(--shadow-text-muted)" }}
        >
          {value}%
        </span>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.22em]"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          {title}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Unsaved changes confirmation bar ──────────────────────────────────────

export function UnsavedChangesBar({
  onDiscard,
  onKeep,
}: {
  onDiscard: () => void;
  onKeep: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-2.5"
      role="alertdialog"
      aria-label="Unsaved changes"
      style={{
        background: "rgba(224,178,92,0.06)",
        borderBottom: "1px solid rgba(224,178,92,0.18)",
      }}
    >
      <span
        className="text-[11px] flex-1"
        style={{ color: "var(--shadow-text-muted)" }}
      >
        Unsaved changes will be lost.
      </span>
      <button
        type="button"
        onClick={onDiscard}
        className="px-2.5 py-1 rounded text-[10.5px] font-mono transition-all"
        style={{
          background: "rgba(224,178,92,0.10)",
          border: "1px solid rgba(224,178,92,0.28)",
          color: "rgba(224,178,92,0.9)",
        }}
      >
        Discard
      </button>
      <button
        type="button"
        onClick={onKeep}
        className="text-[10px] font-mono"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Keep editing
      </button>
    </div>
  );
}
