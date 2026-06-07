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

function IconAnalytics({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
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

function IconLive({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
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

function isIntelActive(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/number") ||
    pathname.startsWith("/draws") ||
    pathname.startsWith("/rankings")
  );
}

function isLiveActive(pathname: string): boolean {
  return pathname === "/live";
}

const MOBILE_TABS = [
  { href: "/", label: "INTEL", Icon: IconAnalytics, showLiveDot: false },
  { href: "/live", label: "LIVE", Icon: IconLive, showLiveDot: true },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const live = useAnyRegionLive();

  return (
    <>
      {/* Desktop top bar */}
      <nav
        className="fixed inset-x-0 top-0 z-40 hidden h-14 items-center justify-between gap-6 px-4 sm:flex"
        style={{
          backgroundColor: "var(--surface-2)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <Link
          href="/"
          className="font-display text-sm font-semibold uppercase"
          style={{ letterSpacing: "0.12em", color: "var(--cyan)" }}
        >
          CHECK4D
        </Link>

        <Link
          href="/live"
          className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.08em]"
        >
          {live ? (
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: "var(--green)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--green)" }}
              />
              LIVE
            </span>
          ) : (
            <span
              className="transition-colors"
              style={{ color: "var(--text-dim)" }}
            >
              SCHEDULE
            </span>
          )}
        </Link>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex h-14 sm:hidden pb-safe"
        style={{
          backgroundColor: "var(--surface-2)",
          borderTop: "1px solid var(--border-dim)",
        }}
        aria-label="Main navigation"
      >
        {MOBILE_TABS.map(({ href, label, Icon, showLiveDot }) => {
          const active =
            href === "/live" ? isLiveActive(pathname) : isIntelActive(pathname);
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
                <Icon />
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
