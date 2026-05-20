import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/supabase/env";
import { getSoulState, getSoulCoreStatus } from "@/lib/souls/soulCore";

const SOUL_STATUS_COLORS: Record<string, string> = {
  growing:  "rgba(214, 184, 116, 0.85)",
  stable:   "rgba(126, 87, 194, 0.75)",
  fading:   "rgba(214, 184, 116, 0.55)",
  critical: "rgba(172, 82, 101, 0.75)",
  empty:    "rgba(95, 90, 104, 0.5)",
};

// Footer pill for Sidebar. Shows current user + signout when authed,
// or a quiet status indicator when Supabase env is missing.
export async function UserPill() {
  const envOk = hasSupabase();
  const user = await getCurrentUser();

  if (!envOk) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-[10px]"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--shadow-border)",
        }}
      >
        <p
          className="font-mono uppercase tracking-widest"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          Shadow Core
        </p>
        <p className="mt-0.5" style={{ color: "var(--shadow-text-faint)" }}>
          Local mode
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="block rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-elev3)]"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--shadow-border)",
          color: "var(--shadow-text-muted)",
        }}
      >
        Sign in →
      </a>
    );
  }

  const soulState = await getSoulState(user.id);
  const soulStatus = soulState ? getSoulCoreStatus(soulState) : null;
  const soulColor = soulStatus ? (SOUL_STATUS_COLORS[soulStatus] ?? SOUL_STATUS_COLORS.empty) : SOUL_STATUS_COLORS.empty;
  const hasSouls = soulState && soulState.current_souls > 0;

  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--shadow-border)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 dot-breathe"
              style={{ background: "var(--shadow-green)" }}
            />
            <p
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: "var(--shadow-text-faint)" }}
            >
              Shadow Core
            </p>
          </div>
          <p
            className="text-[11px] truncate"
            style={{ color: "var(--shadow-text-muted)" }}
          >
            {user.email ?? "—"}
          </p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            className="rounded-md p-1.5 transition-colors hover:bg-[var(--bg-elev3)]"
            style={{ color: "var(--shadow-text-faint)" }}
          >
            <LogOut size={13} />
          </button>
        </form>
      </div>

      {/* Soul Core compact status */}
      {hasSouls && (
        <div
          className="flex items-center justify-between mt-2 pt-2"
          style={{ borderTop: "1px solid var(--shadow-border)" }}
        >
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--shadow-text-faint)" }}>
            Soul Core
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono tabular-nums" style={{ color: soulColor }}>
              {soulState.current_souls}
            </span>
            {soulStatus && soulStatus !== "empty" && (
              <span className="text-[9px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>
                {soulStatus}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
