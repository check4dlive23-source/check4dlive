"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useLang } from "@/lib/language-context";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";

/** Relative in-app path only — blocks open redirects. */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/";
  }
  return raw;
}

function authCallbackUrl(next: string | null): string {
  const path = safeNextPath(next);
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;
}

export function LoginView() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error") === "auth";
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [actionError, setActionError] = useState(false);

  const showError = urlError || actionError;

  async function handleGoogleLogin() {
    const supabase = createAuthBrowserClient();
    if (!supabase) {
      setActionError(true);
      return;
    }
    setGoogleLoading(true);
    setActionError(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl(nextParam) },
    });
    if (error) {
      setActionError(true);
      setGoogleLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    const supabase = createAuthBrowserClient();
    if (!supabase) {
      setActionError(true);
      return;
    }
    setEmailLoading(true);
    setActionError(false);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: authCallbackUrl(nextParam),
      },
    });
    setEmailLoading(false);
    if (error) {
      setActionError(true);
      return;
    }
    setLinkSent(true);
  }

  return (
    <PageLayout
      title={t("loginTitle")}
      titleAccent=""
      subtitle={t("loginSubtitle")}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
          border: "1px solid rgba(0,229,255,0.08)",
          borderRadius: 12,
          padding: "20px 18px",
        }}
      >
        {showError && (
          <p
            style={{
              marginBottom: 16,
              fontFamily: "var(--font-jetbrains)",
              fontSize: 11,
              color: "#FF4D4D",
              letterSpacing: "0.04em",
            }}
          >
            {t("loginError")}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || emailLoading}
          className="flex w-full items-center justify-center"
          style={{
            padding: "14px 16px",
            border: "1px solid rgba(0,229,255,0.45)",
            borderRadius: 8,
            background: "rgba(0,229,255,0.12)",
            color: "#00E5FF",
            fontFamily: "var(--font-jetbrains)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: googleLoading || emailLoading ? "not-allowed" : "pointer",
            opacity: googleLoading || emailLoading ? 0.6 : 1,
          }}
        >
          {googleLoading ? (
            t("loginLoading")
          ) : (
            <>
              <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 009 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.28-1.72V4.96H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l3.01-2.32z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 009 0 9 9 0 00.96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"
                  />
                </svg>
              </span>
              {t("loginWithGoogle")}
            </>
          )}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {t("loginOr")}
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "rgba(255,255,255,0.08)",
            }}
          />
        </div>

        {linkSent ? (
          <p
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: 11,
              color: "#00FF88",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            {t("loginLinkSent")}
          </p>
        ) : (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("loginEmailPlaceholder")}
              required
              disabled={googleLoading || emailLoading}
              className="w-full rounded-lg border border-line-strong bg-surface-3 px-3 py-2.5 text-sm text-foreground placeholder:text-dim focus:outline-none focus:border-gold/50 disabled:opacity-60"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <button
              type="submit"
              disabled={googleLoading || emailLoading || !email.trim()}
              className="w-full rounded-lg border border-line bg-surface-3 px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: "var(--font-jetbrains)", letterSpacing: "0.06em" }}
            >
              {emailLoading ? t("loginLoading") : t("loginSendLink")}
            </button>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
