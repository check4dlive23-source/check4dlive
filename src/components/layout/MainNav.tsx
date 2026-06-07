"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isRegionLiveDraw } from "@/lib/draw-time";
import type { Region } from "@/types";

const REGIONS: Region[] = ["west", "east", "cambodia", "singapore"];

/** True when any region is currently in its live-draw window (client-only). */
function useAnyRegionLive(): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const check = () => setLive(REGIONS.some((r) => isRegionLiveDraw(r)));
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
  return live;
}

type IconProps = { className?: string };

function IconAnalytics({ className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="7" />
      <line x1="18" y1="20" x2="18" y2="10" />
    </svg>
  );
}

function IconLive({ className = "h-[22px] w-[22px]" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 12 7 12 10 4 14 20 17 12 21 12" />
    </svg>
  );
}

function IconRankings({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="20" x2="5" y2="14" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="19" y1="20" x2="19" y2="12" />
    </svg>
  );
}

function isMobileIntelActive(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/number");
}

function isIntelActive(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/number") ||
    pathname.startsWith("/draws") ||
    pathname.startsWith("/rankings")
  );
}

function isDesktopIntelActive(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/number") ||
    pathname.startsWith("/draws")
  );
}

function isLiveActive(pathname: string): boolean {
  return pathname === "/live";
}

function isRankingsActive(pathname: string): boolean {
  return pathname === "/rankings" || pathname.startsWith("/rankings");
}

const MOBILE_TABS = [
  {
    href: "/",
    label: "INTEL",
    Icon: IconAnalytics,
    showLiveDot: false,
    isActive: isMobileIntelActive,
  },
  {
    href: "/rankings",
    label: "RANKS",
    Icon: IconRankings,
    showLiveDot: false,
    isActive: isRankingsActive,
  },
  {
    href: "/live",
    label: "LIVE",
    Icon: IconLive,
    showLiveDot: true,
    isActive: isLiveActive,
  },
] as const;

const DESKTOP_NAV = [
  {
    href: "/",
    label: "INTEL",
    Icon: IconAnalytics,
    isActive: isDesktopIntelActive,
    showLiveDot: false,
  },
  {
    href: "/live",
    label: "LIVE",
    Icon: IconLive,
    isActive: isLiveActive,
    showLiveDot: true,
  },
  {
    href: "/rankings",
    label: "RANKINGS",
    Icon: IconRankings,
    isActive: isRankingsActive,
    showLiveDot: false,
  },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const live = useAnyRegionLive();

  return (
    <>
      {/* Desktop left sidebar */}
      <nav
        className="fixed left-0 top-0 z-40 hidden h-screen w-48 flex-col lg:flex"
        style={{
          backgroundColor: "var(--surface-2)",
          borderRight: "1px solid var(--border-dim)",
        }}
        aria-label="Main navigation"
      >
        <div
          className="border-b px-5 py-6"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <Link
            href="/"
            className="font-display text-[13px] font-semibold uppercase"
            style={{ letterSpacing: "0.12em", color: "var(--cyan)" }}
          >
            CHECK4D
          </Link>
          <p
            className="mt-1 text-[9px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            INTELLIGENCE TERMINAL
          </p>
        </div>

        <div className="flex flex-col gap-1 px-3 py-4">
          {DESKTOP_NAV.map(({ href, label, Icon, isActive, showLiveDot }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 font-sans text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? ""
                    : "hover:text-[var(--text-secondary)]"
                }`}
                style={{
                  color: active ? "var(--cyan)" : "var(--text-dim)",
                  backgroundColor: active
                    ? "rgba(0,229,255,0.06)"
                    : "transparent",
                  borderLeft: active
                    ? "2px solid var(--cyan)"
                    : "2px solid transparent",
                }}
              >
                <span className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {showLiveDot && live && (
                    <span
                      className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: "var(--green)" }}
                    />
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </div>

        <div
          className="mt-auto border-t px-5 py-4"
          style={{ borderColor: "var(--border-dim)" }}
        >
          <p
            className="text-[9px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            MY · SG · KH
          </p>
          {live ? (
            <p
              className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.08em]"
              style={{ color: "var(--green)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--green)" }}
              />
              LIVE NOW
            </p>
          ) : (
            <p
              className="mt-1 text-[9px] uppercase tracking-[0.08em]"
              style={{ color: "var(--text-dim)" }}
            >
              OFFLINE
            </p>
          )}
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex h-14 pb-safe lg:hidden"
        style={{
          backgroundColor: "var(--surface-2)",
          borderTop: "1px solid var(--border-dim)",
        }}
        aria-label="Main navigation"
      >
        {MOBILE_TABS.map(({ href, label, Icon, showLiveDot, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
              style={{
                color: active ? "var(--cyan)" : "var(--text-dim)",
              }}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" />
                {showLiveDot && live && (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--green)" }}
                  />
                )}
              </span>
              <span className="font-sans text-[9px] uppercase leading-none tracking-[0.06em]">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
