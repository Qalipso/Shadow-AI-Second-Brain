// Local-only (Phase 2.3) check-in state. DB persistence lands in Phase 3.4.
// All helpers are safe to call on the server (no-ops there).

const DRAFT_KEY = "shadow:checkIn:draft";
const COMPLETED_PREFIX = "shadow:checkIn:done:"; // + YYYY-MM-DD
const DISMISSED_PREFIX = "shadow:checkIn:dismissed:"; // + YYYY-MM-DD
const SETTINGS_KEY = "shadow:settings";

export type CheckInDraft = {
  step: number; // 0-based
  answers: Record<number, string | number>; // questionId → value
  skipped: number[]; // questionIds
  replaced: number[]; // questionIds the user requested to swap
};

export const EMPTY_DRAFT: CheckInDraft = {
  step: 0,
  answers: {},
  skipped: [],
  replaced: [],
};

export function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function todayKey(): string {
  // YYYY-MM-DD in local time.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadDraft(): CheckInDraft {
  if (!isClient()) return EMPTY_DRAFT;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<CheckInDraft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: CheckInDraft) {
  if (!isClient()) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage quota / disabled → silent.
  }
}

export function clearDraft() {
  if (!isClient()) return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function markCompletedToday() {
  if (!isClient()) return;
  try {
    localStorage.setItem(`${COMPLETED_PREFIX}${todayKey()}`, new Date().toISOString());
  } catch {
    // ignore
  }
}

export function isCompletedToday(): boolean {
  if (!isClient()) return false;
  try {
    return Boolean(localStorage.getItem(`${COMPLETED_PREFIX}${todayKey()}`));
  } catch {
    return false;
  }
}

export function markDismissedToday() {
  if (!isClient()) return;
  try {
    localStorage.setItem(`${DISMISSED_PREFIX}${todayKey()}`, "true");
  } catch {
    // ignore
  }
}

export function isDismissedToday(): boolean {
  if (!isClient()) return false;
  try {
    return Boolean(localStorage.getItem(`${DISMISSED_PREFIX}${todayKey()}`));
  } catch {
    return false;
  }
}

export function getCompletedAtToday(): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(`${COMPLETED_PREFIX}${todayKey()}`);
  } catch {
    return null;
  }
}

// ─── Settings (local-only stub for Phase 2.3) ─────────────────────────────

// How often the proactive Shadow hint (check-in nag) may show up.
// "off" disables proactive hints entirely.
export type CheckinCadence =
  | "15m"
  | "1h"
  | "4h"
  | "2x_day"
  | "1x_day"
  | "off";

export const CADENCE_MS: Record<CheckinCadence, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "2x_day": 12 * 60 * 60 * 1000,
  "1x_day": 24 * 60 * 60 * 1000,
  off: Number.POSITIVE_INFINITY,
};

export const CADENCE_LABEL: Record<CheckinCadence, string> = {
  "15m": "Every 15 minutes",
  "1h": "Every hour",
  "4h": "Every 4 hours",
  "2x_day": "Twice a day",
  "1x_day": "Once a day",
  off: "Off",
};

export type LocalSettings = {
  showQuestionsOnFirstOpen: boolean;
  questionsPerDay: number; // 3 | 5 | 7
  checkinCadence: CheckinCadence;
};

export const DEFAULT_SETTINGS: LocalSettings = {
  showQuestionsOnFirstOpen: true,
  questionsPerDay: 5,
  checkinCadence: "1x_day",
};

export function loadSettings(): LocalSettings {
  if (!isClient()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<LocalSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LocalSettings) {
  if (!isClient()) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}
