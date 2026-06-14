"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { VyraBriefRow } from "@/lib/vyra/brief-queries";
import { vyraSignalIcon, vyraSignalLabelKey } from "@/lib/vyra/signal-labels";
import type { VyraRegion, VyraSignal } from "@/lib/vyra/types";
import { todayMYT } from "@/lib/draw-time";
import { saveBriefRegion } from "@/app/brief/BriefRegionRedirect";

const REGIONS: VyraRegion[] = ["west", "east", "singapore"];

function narrativeText(brief: VyraBriefRow, index: number): string {
  const seg = brief.narrative.find((n) => n.signalIndex === index);
  return seg?.text ?? "";
}

interface VyraBriefViewProps {
  region: VyraRegion;
  briefs: { zh: VyraBriefRow | null; en: VyraBriefRow | null };
  isPro: boolean;
  compact?: boolean;
}

export function VyraBriefView({ region, briefs, isPro, compact = false }: VyraBriefViewProps) {
  const { t, lang } = useLang();
  const brief =
    lang === "zh" ? briefs.zh ?? briefs.en : briefs.en ?? briefs.zh;
  const today = todayMYT();
  const isStale = brief != null && brief.brief_date !== today;

  const regionLabel =
    region === "west"
      ? t("westMY")
      : region === "east"
        ? t("eastMY")
        : t("singapore");

  return (
    <div
      className={compact ? "" : "mx-auto max-w-2xl px-4 py-10 pb-28 lg:pb-12 lg:pl-52"}
      style={{ color: "rgba(255,255,255,0.75)" }}
    >
      <style>{`
        @keyframes vyraSignalIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {!compact && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Link
                key={r}
                href={`/brief/${r}`}
                onClick={() => saveBriefRegion(r)}
                style={{
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 100,
                  fontFamily: "var(--font-jetbrains)",
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  border:
                    r === region
                      ? "1px solid rgba(167,139,250,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    r === region
                      ? "rgba(167,139,250,0.12)"
                      : "rgba(255,255,255,0.03)",
                  color: r === region ? "#A78BFA" : "rgba(255,255,255,0.45)",
                }}
              >
                {r === "west" ? t("westMY") : r === "east" ? t("eastMY") : t("singapore")}
              </Link>
            ))}
          </div>

          <header
            className="mb-6"
            style={{ borderLeft: "2px solid #A78BFA", paddingLeft: 12 }}
          >
            <h1
              className="text-lg font-bold tracking-wide"
              style={{ color: "white" }}
            >
              <span style={{ color: "#A78BFA", marginRight: 6 }}>◤</span>
              {t("vyraBriefTitle")} — {regionLabel}
            </h1>
            {brief && (
              <>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {formatDrawDate(brief.brief_date)}
                  {isStale && (
                    <span style={{ marginLeft: 8, color: "#A78BFA", fontSize: 11 }}>
                      ({t("vyraBriefLatestArchive")})
                    </span>
                  )}
                </p>
                {brief.intro && (
                  <p className="mt-3 text-sm leading-relaxed">{brief.intro}</p>
                )}
              </>
            )}
          </header>
        </>
      )}

      {!brief ? (
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          {t("vyraBriefEmpty")}
        </p>
      ) : (
        <div className="space-y-4">
          {brief.signals.map((signal, i) => {
            const locked = !isPro && i >= 2;
            const text = narrativeText(brief, i);
            return (
              <SignalCard
                key={`${signal.type}-${i}`}
                signal={signal as VyraSignal}
                text={text}
                locked={locked}
                compact={compact}
                index={i}
                totalSignals={brief.signals.length}
                t={t}
              />
            );
          })}

          {brief.signals.length > 2 && !isPro && !compact && (
            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {t("vyraBriefFreeLimit")}
            </p>
          )}
        </div>
      )}

      {!compact && (
        <>
          <section
            className="mt-8 rounded-xl"
            style={{
              padding: "14px 16px",
              border: "1px dashed rgba(167,139,250,0.25)",
              background: "rgba(167,139,250,0.04)",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "#A78BFA" }}>
              🔒 {t("vyraBriefPersonalTitle")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("vyraBriefPersonalLocked")}
            </p>
          </section>

          <footer className="mt-8 space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
            <p>{t("vyraBriefFootnote1")}</p>
            <p>{t("vyraBriefFootnote2")}</p>
            <p className="pt-4">
              <Link href="/" className="hover:text-white/60 underline-offset-2 hover:underline">
                ← {t("home")}
              </Link>
            </p>
          </footer>
        </>
      )}
    </div>
  );
}

function SignalCard({
  signal,
  text,
  locked,
  compact,
  index,
  totalSignals,
  t,
}: {
  signal: VyraSignal;
  text: string;
  locked: boolean;
  compact?: boolean;
  index: number;
  totalSignals: number;
  t: (key: import("@/lib/i18n").TranslationKey) => string;
}) {
  return (
    <article
      className="relative overflow-hidden rounded-xl"
      style={{
        animation: compact ? undefined : `vyraSignalIn 0.4s ease ${index * 80}ms both`,
        background: "rgba(167,139,250,0.06)",
        border: "1px solid rgba(167,139,250,0.15)",
        borderLeft: "2px solid #A78BFA",
        padding: compact ? "12px 14px" : "14px 16px",
        userSelect: locked ? "none" : "auto",
      }}
    >
      <div
        style={{
          filter: locked ? "blur(6px)" : "none",
          pointerEvents: locked ? "none" : "auto",
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span>{vyraSignalIcon(signal)}</span>
          <span
            style={{
              fontSize: 10,
              color: "#A78BFA",
              fontFamily: "var(--font-jetbrains)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {t(vyraSignalLabelKey(signal))}
          </span>
        </div>
        {text && (
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
            {text}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {signal.numbers.map((num) => (
            <Link
              key={num}
              href={`/number/${num}`}
              className="font-mono tabular-nums"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#A78BFA",
                textDecoration: "none",
              }}
            >
              {num}
            </Link>
          ))}
        </div>
      </div>
      {locked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
          style={{ background: "rgba(7,7,16,0.55)" }}
        >
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            🔒 {t("vyraBriefLockOverlay").replace("{n}", String(totalSignals - 2))}
          </p>
          <Link
            href="/pro"
            style={{
              fontSize: 11,
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(167,139,250,0.2)",
              border: "1px solid rgba(167,139,250,0.4)",
              color: "#A78BFA",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("vyraBriefUnlockPro")}
          </Link>
        </div>
      )}
    </article>
  );
}
