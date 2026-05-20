"use client";

import { useState, useEffect } from "react";
import { FieldRow, SectionGroup, TextInput } from "./Rows";

const STORAGE_KEY = "shadow:settings:profile";

function formatTimezone(): { city: string; iana: string } {
  if (typeof Intl === "undefined") return { city: "UTC", iana: "UTC" };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "America/Montevideo"
  try {
    const parts = tz.split("/");
    const city = (parts[parts.length - 1] ?? tz).replace(/_/g, " ");
    return { city, iana: tz };
  } catch {
    return { city: tz, iana: tz };
  }
}

function formatLanguage(): string {
  if (typeof navigator === "undefined") return "English";
  const locale = navigator.language;
  try {
    // Use base language only ("en" not "en-US") to avoid "American English"
    const baseLang = locale.split("-")[0];
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    const name = dn.of(baseLang);
    if (name) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // fallback
  }
  // Strip region code from raw value (en-US → en-US, but show as-is if Intl fails)
  return locale.split("-")[0];
}

function loadName(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { shadowName?: string };
    return parsed.shadowName ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ shadowName: name }));
  } catch {
    // ignore
  }
}

export function ProfileSection({ email }: { email?: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [shadowName, setShadowName] = useState("");

  useEffect(() => {
    setMounted(true);
    setShadowName(loadName());
  }, []);

  function onNameChange(v: string) {
    setShadowName(v);
    saveName(v);
  }

  if (!mounted) return <div className="h-32 skeleton rounded-lg" />;

  const tz = formatTimezone();

  return (
    <SectionGroup
      title="Profile"
      description="You and your Shadow."
    >
      <FieldRow label="Shadow name" hint="Give your Shadow a name. Used in greetings and reports.">
        <TextInput
          value={shadowName}
          placeholder="e.g. Echo, Nyx, Shade..."
          onChange={onNameChange}
        />
      </FieldRow>
      <FieldRow label="Email" hint="Tied to your Shadow account.">
        <TextInput value={email ?? ""} readOnly placeholder="---" type="email" />
      </FieldRow>
      <FieldRow label="Timezone" hint={tz.iana}>
        <span className="text-xs text-zinc-300">{tz.city}</span>
      </FieldRow>
      <FieldRow label="Language" hint="Shadow's response language.">
        <span className="text-xs text-zinc-300">{formatLanguage()}</span>
      </FieldRow>
    </SectionGroup>
  );
}
