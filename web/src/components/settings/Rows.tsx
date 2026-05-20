"use client";

// Reusable controls for Settings sections. All visual; persistence is handled
// per-section (localStorage for now, Supabase user_settings later).

import React from "react";

export function SectionGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-300">
          {title}
        </p>
        {description ? (
          <p className="text-[11px] text-zinc-500 mt-0.5">{description}</p>
        ) : null}
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function FieldRow({
  label,
  hint,
  children,
  comingSoon,
  stacked,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
  comingSoon?: boolean;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div
        className={`rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3 space-y-2 ${
          comingSoon ? "opacity-60" : ""
        }`}
      >
        <div>
          <p className="text-sm text-zinc-200">{label}</p>
          {hint ? <p className="text-[11px] text-zinc-500 mt-0.5">{hint}</p> : null}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3 ${
        comingSoon ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        {hint ? <p className="text-[11px] text-zinc-500 mt-0.5">{hint}</p> : null}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {comingSoon ? (
          <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
            soon
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function TextInput({
  value,
  placeholder,
  readOnly,
  onChange,
  type = "text",
}: {
  value: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: (v: string) => void;
  type?: "text" | "email";
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className="rounded-md bg-[var(--bg-elev3)] border border-zinc-800 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)] w-44 disabled:opacity-50"
    />
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked
          ? "bg-[var(--accent-warm)]"
          : "bg-zinc-800 border border-zinc-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-black transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function SegmentedSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange?: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`inline-flex rounded-md border border-zinc-800 bg-[var(--bg-elev3)] p-0.5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(o.id)}
          className={
            value === o.id
              ? "rounded-[5px] bg-[var(--accent-warm)] text-black px-2 py-0.5 text-[11px] font-medium"
              : "rounded-[5px] px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-100"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DescriptiveSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string; description: string }>;
  onChange?: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5 w-full">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange?.(o.id)}
          className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
            value === o.id
              ? "border-[var(--accent-warm)]/60 bg-[var(--accent-warm)]/5"
              : "border-zinc-800 bg-[var(--bg-elev3)] hover:border-zinc-700"
          }`}
        >
          <span
            className={`text-xs font-medium ${
              value === o.id ? "text-[var(--accent-warm)]" : "text-zinc-300"
            }`}
          >
            {o.label}
          </span>
          <p className="text-[10px] text-zinc-500 mt-0.5">{o.description}</p>
        </button>
      ))}
    </div>
  );
}

export function MultiSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T[];
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange?: (v: T[]) => void;
}) {
  function toggle(id: T) {
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange?.(next);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => toggle(o.id)}
          className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
            value.includes(o.id)
              ? "border-[var(--accent-warm)]/60 bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DangerButton({
  children,
  onClick,
  disabled = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-[var(--state-danger)]/40 text-[var(--state-danger)] px-2.5 py-1 text-[11px] hover:bg-[var(--state-danger)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
