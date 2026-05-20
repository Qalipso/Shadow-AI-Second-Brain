"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  ScanLine,
  CircleDot,
  Navigation,
  Repeat,
  Route,
  Layers,
  Brain,
  FlaskConical,
  Zap,
  Settings as SettingsIcon,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Core",
    items: [
      { href: "/dashboard",     label: "Today",         icon: LayoutDashboard },
      { href: "/inbox",         label: "Inbox",         icon: Inbox },
      { href: "/checkin",       label: "Check-in",      icon: ScanLine },
      { href: "/interventions", label: "Interventions", icon: Zap },
    ],
  },
  {
    label: "Self Map",
    items: [
      { href: "/areas",     label: "Life Circle", icon: CircleDot },
      { href: "/direction", label: "Direction",   icon: Navigation },
      { href: "/rituals",   label: "Rituals",     icon: Repeat },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/journey",  label: "Journey",  icon: Route },
      { href: "/insights", label: "Insights", icon: Layers },
      { href: "/memory",   label: "Memory",   icon: Brain },
      { href: "/labs",     label: "Labs",     icon: FlaskConical },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function Sidebar({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 rounded-md p-3 text-zinc-400 hover:text-zinc-100 hover:bg-[var(--bg-elev2)] transition-colors"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          aria-hidden
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50",
          "w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elev1)] flex flex-col",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 flex items-center justify-between">
          <Link href="/dashboard" className="leading-tight">
            <p className="font-[family-name:var(--font-fraunces)] text-[17px] tracking-tight">
              Shadow
            </p>
            <p className="text-[9px] uppercase tracking-[0.28em]" style={{ color: "var(--shadow-text-faint)" }}>
              Second Memory
            </p>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden rounded-md p-2 text-zinc-500 hover:text-zinc-100 hover:bg-[var(--bg-elev2)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="h-px mx-5" style={{ background: "var(--shadow-border)" }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label || `group-${gi}`}>
              {group.label ? (
                <p
                  className="px-3 mb-1 text-[9px] font-mono uppercase tracking-[0.25em]"
                  style={{ color: "rgba(255,255,255,0.15)" }}
                >
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-150",
                        active
                          ? "text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-[rgba(255,255,255,0.04)]",
                      )}
                      style={active ? {
                        background: "rgba(201,163,106,0.07)",
                        borderLeft: "2px solid var(--accent-warm)",
                        paddingLeft: "10px",
                      } : undefined}
                    >
                      <Icon
                        size={14}
                        className="flex-shrink-0"
                        style={{ color: active ? "var(--accent-warm)" : undefined }}
                      />
                      <span className="flex-1 leading-none">{item.label}</span>
                      {active && (
                        <span
                          className="w-1 h-1 rounded-full flex-shrink-0 dot-breathe"
                          style={{ background: "var(--accent-warm)" }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="h-px mx-5" style={{ background: "var(--shadow-border)" }} />

        <div className="px-4 py-4 space-y-3">
          {footer}
          <p
            className="text-[9px] uppercase tracking-[0.25em] text-center"
            style={{ color: "rgba(255,255,255,0.1)" }}
          >
            v0.1 · MVP
          </p>
        </div>
      </aside>
    </>
  );
}
