"use client";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useLang } from "@/lib/language-context";
import type { HotNumberRow, ColdNumberRow } from "@/types/analytics";

interface RecentDraw {
  id: string;
  date: string;
  operator: string;
  first_prize: string;
  second_prize: string;
  third_prize: string;
}

interface OperatorViewProps {
  name: string;
  label: string;
  color: string;
  logo: string;
  games: string[];
  hotNumbers: HotNumberRow[];
  coldNumbers: ColdNumberRow[];
  recentDraws: RecentDraw[];
  totalDraws: number;
  earliestDate: string | null;
  latestDate: string | null;
  dataNote?: string;
}

export function OperatorView({
  name, label, color, logo, games,
  hotNumbers, coldNumbers, recentDraws,
  totalDraws, earliestDate, latestDate,
}: OperatorViewProps) {
  const { t } = useLang();

  return (
    <PageLayout
      title=""
      titleAccent={label}
      subtitle={`4D Analytics & Intelligence`}
      showBack
    >
      {/* ── HERO 统计 ── */}
      <div className="relative overflow-hidden rounded-2xl mb-6" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #0a0e1a 100%)", border: `1px solid ${color}30`, padding: "20px 20px" }}>
        <div className="absolute" style={{ top: -40, right: -40, width: 180, height: 180, background: `radial-gradient(circle, ${color}30, transparent 65%)` }} />
        <div className="absolute top-0 left-0 right-0" style={{ height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={label} style={{ height: 28, width: "auto", marginBottom: 16 }} />
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("operatorTotalDraws"), value: totalDraws.toLocaleString() },
            { label: t("operatorEarliest"), value: earliestDate ? earliestDate.slice(0, 7) : "—" },
            { label: t("operatorLatestDraw"), value: latestDate ? latestDate.slice(5) : "—" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono font-bold tabular-nums" style={{ fontSize: 20, color, lineHeight: 1.2 }}>{stat.value}</div>
              <div className="font-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 旗下游戏 ── */}
      <section className="mb-6">
        <h2 className="font-mono font-bold" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 10 }}>{t("operatorGames").toUpperCase()}</h2>
        <div className="flex flex-wrap gap-2">
          {games.map((game) => (
            <span key={game} className="font-mono" style={{ fontSize: 11, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 100, padding: "5px 12px" }}>
              {game}
            </span>
          ))}
        </div>
      </section>

      {/* ── 热号 Top 10 ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <h2 className="font-mono font-bold" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>{t("operatorHotNumbers")}</h2>
          <Link href={`/rankings?tab=hot&operators=${name}`} className="font-mono" style={{ fontSize: 10, color }}>{t("operatorViewAll")}</Link>
        </div>
        <div className="flex flex-col gap-2">
          {hotNumbers.length === 0 ? (
            <p className="font-mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("operatorNoData")}</p>
          ) : hotNumbers.slice(0, 10).map((row, i) => (
            <Link key={row.number} href={`/number/${row.number}?operators=${name}`} className="flex items-center justify-between rounded-xl" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #0a0e1a 100%)", border: `1px solid ${color}20`, padding: "10px 14px" }}>
              <div className="flex items-center gap-3">
                <span className="font-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", width: 24 }}>#{String(i + 1).padStart(2, "0")}</span>
                <span className="font-mono tabular-nums font-bold" style={{ fontSize: 22, color: "white", textShadow: `0 0 20px ${color}80` }}>{row.number}</span>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold" style={{ fontSize: 13, color }}>{row.total_hits} <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{t("operatorTimes")}</span></div>
                <div className="font-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{row.last_seen ? row.last_seen.slice(0, 10) : "—"}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 冷号 Top 10 ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <h2 className="font-mono font-bold" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>{t("operatorColdNumbers")}</h2>
          <Link href={`/rankings?tab=cold&operators=${name}`} className="font-mono" style={{ fontSize: 10, color: "#FFB020" }}>{t("operatorViewAll")}</Link>
        </div>
        <div className="flex flex-col gap-2">
          {coldNumbers.length === 0 ? (
            <p className="font-mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("operatorNoData")}</p>
          ) : coldNumbers.slice(0, 10).map((row, i) => (
            <Link key={row.number} href={`/number/${row.number}?operators=${name}`} className="flex items-center justify-between rounded-xl" style={{ background: "linear-gradient(135deg, #1a1200 0%, #0a0e1a 100%)", border: "1px solid rgba(255,176,32,0.2)", padding: "10px 14px" }}>
              <div className="flex items-center gap-3">
                <span className="font-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", width: 24 }}>#{String(i + 1).padStart(2, "0")}</span>
                <span className="font-mono tabular-nums font-bold" style={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>{row.number}</span>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold" style={{ fontSize: 13, color: "#FFB020" }}>{row.gap_days} <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{t("operatorDaysOut")}</span></div>
                <div className="font-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{row.last_seen_date ? row.last_seen_date.slice(0, 10) : t("operatorNever")}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 最近开彩 ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <h2 className="font-mono font-bold" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>{t("operatorRecentDraws")}</h2>
          <Link href="/draws" className="font-mono" style={{ fontSize: 10, color: "rgba(0,229,255,0.6)" }}>{t("operatorViewAll")}</Link>
        </div>
        <div className="flex flex-col gap-2">
          {recentDraws.length === 0 ? (
            <p className="font-mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t("operatorNoData")}</p>
          ) : recentDraws.map((draw) => (
            <Link key={draw.id} href={`/draw/${draw.date}-${draw.operator}`} className="flex items-center justify-between rounded-xl" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #0a0e1a 100%)", border: "1px solid rgba(0,229,255,0.1)", padding: "10px 14px" }}>
              <div>
                <div className="font-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{draw.date}</div>
                <div className="font-mono tabular-nums font-bold" style={{ fontSize: 18, color: "white" }}>{draw.first_prize}</div>
              </div>
              <div className="text-right font-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                <div>{draw.second_prize}</div>
                <div>{draw.third_prize}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </PageLayout>
  );
}
