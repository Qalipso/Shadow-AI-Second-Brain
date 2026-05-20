import { getCurrentUser } from "@/lib/auth";
import { getSoulState, getSoulCoreStatus } from "@/lib/souls/soulCore";
import Link from "next/link";
import { SoulCoreOrbit } from "./SoulCoreOrbit";
import { SparklesText, NumberTicker } from "@/components/fx";

const STATUS_COLOR: Record<string, string> = {
  growing:  "rgba(214, 184, 116, 0.9)",
  stable:   "rgba(126, 87, 194, 0.85)",
  fading:   "rgba(214, 184, 116, 0.55)",
  critical: "rgba(172, 82, 101, 0.85)",
  empty:    "rgba(95, 90, 104, 0.5)",
};

export async function SoulCoreHero() {
  const user = await getCurrentUser();
  if (!user) return null;

  const soulState = await getSoulState(user.id);
  const souls = soulState?.current_souls ?? 0;
  const status = soulState ? getSoulCoreStatus(soulState) : "empty";
  const color = STATUS_COLOR[status];

  return (
    <Link
      href="/protocols"
      className="flex flex-col items-center justify-center py-8 group"
      style={{ textDecoration: "none" }}
    >
      <p
        className="text-[11px] font-mono uppercase tracking-[0.3em] mb-3"
        style={{ color: "var(--shadow-text-faint)" }}
      >
        Soul Core
      </p>
      <SoulCoreOrbit color={color}>
        <div
          className="relative flex items-center justify-center w-28 h-28 rounded-full transition-transform group-hover:scale-105"
          style={{
            background: `radial-gradient(circle at 38% 32%, ${color}18 0%, rgba(12,12,18,0.95) 70%)`,
            border: `1px solid ${color}30`,
            boxShadow: `0 0 40px ${color}15, 0 0 80px ${color}08`,
          }}
        >
          <SparklesText count={4}>
            <span
              style={{
                color,
                fontSize: souls > 9999 ? "2rem" : "3rem",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
              className="font-light font-mono tabular-nums inline-block"
            >
              <NumberTicker value={souls} format="compact" duration={1.6} />
            </span>
          </SparklesText>
        </div>
      </SoulCoreOrbit>
      {soulState && (
        <p
          className="mt-3 text-[11px] font-mono"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          <NumberTicker value={soulState.lifetime_souls} duration={1.8} delay={0.2} /> lifetime · cycle: <NumberTicker value={soulState.reset_count > 0 ? soulState.reset_count + 1 : 1} duration={0.9} delay={0.4} />
        </p>
      )}
    </Link>
  );
}
