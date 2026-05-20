import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getSoulState,
  getSoulCoreStatus,
  getSoulResetDeadline,
  formatTimeUntilReset,
  formatCycleDuration,
} from "@/lib/souls/soulCore";
import type { UserSoulState } from "@/types/db";

// ─── Status → visual tokens ──────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  growing:  "rgba(214, 184, 116, 0.85)",  // gold
  stable:   "rgba(126, 87, 194, 0.75)",   // violet
  fading:   "rgba(214, 184, 116, 0.55)",  // dim gold
  critical: "rgba(172, 82, 101, 0.75)",   // red
  empty:    "rgba(95, 90, 104, 0.6)",     // faint
};

const STATUS_LABEL: Record<string, string> = {
  growing:  "The core is growing",
  stable:   "Soul Core stable",
  fading:   "The thread is fading",
  critical: "Return with one small ritual",
  empty:    "Begin with one small trace",
};

// ─── Orb ─────────────────────────────────────────────────────────────────────

function SoulOrb({ souls, color }: { souls: number; color: string }) {
  return (
    <div
      className="relative flex items-center justify-center w-14 h-14 rounded-full flex-shrink-0"
      style={{
        background: `radial-gradient(circle at 38% 32%, ${color}22 0%, rgba(12,12,18,0.9) 70%)`,
        border: `1px solid ${color}35`,
        boxShadow: `0 0 20px ${color}18, inset 0 0 12px rgba(0,0,0,0.6)`,
      }}
    >
      <span
        className="text-[18px] font-light font-mono tabular-nums"
        style={{ color, letterSpacing: "-0.03em" }}
      >
        {souls > 999 ? `${Math.floor(souls / 1000)}k` : souls}
      </span>
    </div>
  );
}

// ─── Empty state (no soul state yet) ─────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-3"
      style={{
        background: "var(--shadow-panel-soft)",
        borderColor: "var(--shadow-border)",
      }}
    >
      <SoulOrb souls={0} color={STATUS_COLOR.empty} />
      <div>
        <p
          className="text-[10px] font-mono uppercase tracking-widest mb-0.5"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          Soul Core
        </p>
        <p className="text-[12px]" style={{ color: "var(--shadow-text-muted)" }}>
          Begin with one small trace
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--shadow-text-faint)" }}>
          Complete a ritual to start gathering souls.
        </p>
      </div>
    </div>
  );
}

// ─── Loaded state ────────────────────────────────────────────────────────────

function LoadedState({ state }: { state: UserSoulState }) {
  const status = getSoulCoreStatus(state);
  const deadline = getSoulResetDeadline(state);
  const timeUntil = formatTimeUntilReset(deadline);
  const cycleDuration = formatCycleDuration(state.cycle_started_at);
  const color = STATUS_COLOR[status];
  const label = STATUS_LABEL[status];
  const isCritical = status === "critical" || status === "fading";

  return (
    <Link
      href="/protocols"
      className="block rounded-xl border p-4 transition-all group"
      style={{
        background:
          status === "growing"
            ? "rgba(214, 184, 116, 0.03)"
            : "var(--shadow-panel-soft)",
        borderColor:
          status === "growing" || status === "stable"
            ? "var(--shadow-border-active)"
            : "var(--shadow-border)",
        boxShadow:
          status === "growing" ? "var(--shadow-glow-gold)" : "none",
      }}
    >
      <div className="flex items-start gap-3">
        <SoulOrb souls={state.current_souls} color={color} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Soul Core
            </p>
            {state.reset_count > 0 && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(95,90,104,0.2)",
                  color: "var(--shadow-text-faint)",
                }}
              >
                cycle {state.reset_count + 1}
              </span>
            )}
          </div>

          <p
            className="text-[12px] font-medium"
            style={{ color: isCritical ? color : "var(--shadow-text)" }}
          >
            {label}
          </p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-muted)" }}>
              {state.lifetime_souls} lifetime
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
              cycle: {cycleDuration}
            </span>
            {deadline && (
              <span
                className="text-[11px] font-mono"
                style={{ color: isCritical ? color : "var(--shadow-text-faint)" }}
              >
                {timeUntil} until silence
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Component (server) ──────────────────────────────────────────────────────

export async function SoulCoreCard() {
  const user = await getCurrentUser();
  if (!user) return null;

  const soulState = await getSoulState(user.id);

  if (!soulState || soulState.current_souls === 0) {
    return <EmptyState />;
  }

  return <LoadedState state={soulState} />;
}
