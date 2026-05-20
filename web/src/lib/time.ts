// Tiny date helpers shared by Inbox + RecentSignals.
// Browser-locale aware. Server output may differ from client mount —
// any component using these should mount-gate to avoid hydration mismatch.

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

export function relativeTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = now - t;
  if (diff < MIN) return "just now";
  if (diff < HR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayLabel(key: string): string {
  if (key === "unknown") return "Earlier";
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yestKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  if (key === today) return "Today";
  if (key === yestKey) return "Yesterday";
  return target.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
