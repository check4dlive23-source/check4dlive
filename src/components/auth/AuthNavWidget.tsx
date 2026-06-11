"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/language-context";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";
import type { User } from "@supabase/supabase-js";

interface Props {
  /** "desktop" = 侧栏底部横条样式; "mobile" = 右上角圆形图标 */
  variant: "desktop" | "mobile";
}

function IconUser({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function AuthNavWidget({ variant }: Props) {
  const { t } = useLang();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createAuthBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const signOut = async () => {
    const supabase = createAuthBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setMenuOpen(false);
    window.location.href = "/";
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = (user?.email?.[0] ?? "U").toUpperCase();

  if (!user) {
    if (variant === "desktop") {
      return (
        <Link
          href="/login"
          className="flex items-center gap-2 px-5 py-3 text-[11px] uppercase tracking-[0.08em]"
          style={{ color: "var(--text-dim)" }}
        >
          <IconUser className="h-4 w-4" />
          {t("navSignIn")}
        </Link>
      );
    }
    return (
      <Link
        href="/login"
        aria-label={t("navSignIn")}
        className="flex h-8 w-8 items-center justify-center rounded-full border"
        style={{
          borderColor: "var(--border-dim)",
          color: "var(--text-dim)",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <IconUser className="h-4 w-4" />
      </Link>
    );
  }

  const avatar = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
      style={{ backgroundColor: "rgba(0,229,255,0.15)", color: "var(--cyan)" }}
    >
      {initial}
    </span>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={
          variant === "desktop"
            ? "flex w-full items-center gap-2 px-5 py-3"
            : "block"
        }
        aria-label={t("navAccount")}
      >
        {avatar}
        {variant === "desktop" && (
          <span
            className="truncate text-[11px]"
            style={{ color: "var(--text-dim)" }}
          >
            {user.email}
          </span>
        )}
      </button>
      {menuOpen && (
        <div
          className={
            variant === "desktop"
              ? "absolute bottom-full left-3 z-50 mb-1 w-40 rounded border py-1"
              : "absolute right-0 top-full z-50 mt-1 w-40 rounded border py-1"
          }
          style={{
            backgroundColor: "rgba(8,14,22,0.97)",
            borderColor: "var(--border-dim)",
          }}
        >
          <Link
            href="/watchlist"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            {t("navWatchlist")}
          </Link>
          <Link
            href="/pro"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--amber)" }}
          >
            {t("navPro")}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="block w-full px-3 py-2 text-left text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "var(--text-dim)" }}
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
