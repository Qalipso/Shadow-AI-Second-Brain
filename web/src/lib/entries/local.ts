import type { InboxEntry } from "./types";

// Local-only entry store. Persists in localStorage so dev mode survives reload.
// Phase 3.3 replaces this with Supabase reads/writes (still keeping a small
// localStorage cache for optimistic UI).

const KEY = "shadow:entries";
const MAX = 500;

function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readAll(): InboxEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Trust the on-disk shape; downstream consumers can re-validate.
    return parsed as InboxEntry[];
  } catch {
    return [];
  }
}

function writeAll(list: InboxEntry[]) {
  if (!isClient()) return;
  try {
    // Newest first, cap to MAX.
    const sorted = [...list].sort(
      (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
    );
    localStorage.setItem(KEY, JSON.stringify(sorted.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent("shadow:entries:changed"));
  } catch {
    // Quota exhausted / disabled — silent.
  }
}

export function listLocalEntries(limit = 50, offset = 0): InboxEntry[] {
  return readAll().slice(offset, offset + limit);
}

export function countLocalEntries(): number {
  return readAll().length;
}

export function createLocalEntry(text: string): InboxEntry {
  const entry: InboxEntry = {
    id: `local-${cryptoRandom()}`,
    text,
    status: "unprocessed",
    createdAt: new Date().toISOString(),
    summary: null,
    entryType: null,
    lifeAreaSlug: null,
    emotionPrimary: null,
  };
  writeAll([entry, ...readAll()]);
  return entry;
}

export function deleteLocalEntry(id: string) {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function replaceLocalEntry(id: string, next: InboxEntry) {
  writeAll(readAll().map((e) => (e.id === id ? next : e)));
}

function cryptoRandom(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Non-secure fallback.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
