"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NumberScoreGauge } from "@/components/number/NumberScoreGauge";
import { useLang } from "@/lib/language-context";
import { sectionCaption, sectionLockPreview } from "@/lib/vyra/report-copy";
import type { NumberReportData } from "@/lib/vyra/report";
import { useMemo, useState } from "react";

const OP_LABEL: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Toto",
  cashsweep: "Cash Sweep",
  sabah88: "Sabah 88",
  stc: "STC",
  singapore: "Singapore",
};

const OP_LOGO: Record<string, string> = {
  magnum: "/logos/magnum.gif",
  damacai: "/logos/damacai.gif",
  toto: "/logos/toto.gif",
  cashsweep: "/logos/cashsweep.gif",
  sabah88: "/logos/sabah88.gif",
  stc: "/logos/sandakan.gif",
  singapore: "/logos/sgpools.gif",
};

const SECTION_TITLES = [
  "年份热力图",
  "运营商拆解",
  "同冷度对照",
  "镜像对照",
  "开出前形态",
  "评分轨迹",
] as const;

interface Props {
  data: NumberReportData;
  isPro: boolean;
}

function maxHits(cells: { hits: number }[]): number {
  return Math.max(1, ...cells.map((c) => c.hits));
}

export function VyraNumberReportView({ data, isPro }: Props) {
  const { t } = useLang();
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const heatMax = useMemo(() => maxHits(data.yearHeatmap), [data.yearHeatmap]);

  const cohortMax = useMemo(
    () => Math.max(1, ...data.coldCohort.peers.map((p) => p.gapRatio)),
    [data.coldCohort.peers]
  );

  return (
    <div
      className="mx-auto max-w-2xl px-4 py-10 pb-28 lg:pb-12 lg:pl-52"
      style={{ color: "rgba(255,255,255,0.75)" }}
    >
      <header
        className="mb-8"
        style={{ borderLeft: "2px solid #A78BFA", paddingLeft: 12 }}
      >
        <Link
          href={`/number/${data.number}`}
          className="mb-3 inline-block text-xs"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          ← {data.number}
        </Link>
        <h1 className="text-lg font-bold" style={{ color: "white" }}>
          <span style={{ color: "#A78BFA", marginRight: 6 }}>◤</span>
          VYRA 深度报告 · {data.number}
        </h1>
        <div className="mt-4 flex justify-center sm:justify-start">
          <NumberScoreGauge score={data.score} />
        </div>
      </header>

      {/* Section 1 — free */}
      <ReportSection locked={false} title={SECTION_TITLES[0]}>
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sectionCaption(1, data)}
        </p>
        <div
          className="flex gap-0.5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ minHeight: 48 }}
        >
          {data.yearHeatmap.map((cell) => {
            const intensity = cell.hits / heatMax;
            const bg = `rgba(167,139,250,${0.08 + intensity * 0.85})`;
            return (
              <div
                key={cell.year}
                title={`${cell.year}: ${cell.hits}次`}
                onMouseEnter={() => setHoverYear(cell.year)}
                onMouseLeave={() => setHoverYear(null)}
                className="shrink-0 rounded-sm"
                style={{
                  width: 8,
                  height: 40,
                  background: bg,
                  border:
                    hoverYear === cell.year
                      ? "1px solid #A78BFA"
                      : "1px solid transparent",
                }}
              />
            );
          })}
        </div>
        {hoverYear != null && (
          <p className="mt-1 font-mono text-xs" style={{ color: "#A78BFA" }}>
            {hoverYear} ·{" "}
            {data.yearHeatmap.find((y) => y.year === hoverYear)?.hits ?? 0} 次
          </p>
        )}
      </ReportSection>

      {/* Section 2 */}
      <ReportSection
        locked={!isPro}
        title={SECTION_TITLES[1]}
        preview={sectionLockPreview(2, data)}
      >
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sectionCaption(2, data)}
        </p>
        <div className="space-y-2">
          {data.operatorBreakdown.map((row) => (
            <div
              key={row.operator}
              className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "rgba(167,139,250,0.06)",
                border: "1px solid rgba(167,139,250,0.12)",
              }}
            >
              {OP_LOGO[row.operator] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={OP_LOGO[row.operator]} alt="" height={16} />
              )}
              <span className="text-xs font-medium" style={{ minWidth: 72 }}>
                {OP_LABEL[row.operator] ?? row.operator}
              </span>
              <span className="font-mono text-xs">{row.hits} 次</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                均隔 {row.avgGapDraws ?? "—"} 期
              </span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                上次 {row.lastSeen ?? "—"}
              </span>
              {row.gapRatio != null && (
                <span className="font-mono text-xs" style={{ color: "#A78BFA" }}>
                  倍率 {row.gapRatio}×
                </span>
              )}
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Section 3 */}
      <ReportSection
        locked={!isPro}
        title={SECTION_TITLES[2]}
        preview={sectionLockPreview(3, data)}
      >
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sectionCaption(3, data)}
        </p>
        <div className="space-y-2">
          {data.coldCohort.peers.map((p) => (
            <div key={p.number} className="flex items-center gap-2">
              <span
                className="w-10 font-mono text-xs"
                style={{ color: p.isSelf ? "#A78BFA" : "rgba(255,255,255,0.6)" }}
              >
                {p.number}
              </span>
              <div
                className="h-3 flex-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${(p.gapRatio / cohortMax) * 100}%`,
                    background: p.isSelf ? "#A78BFA" : "rgba(167,139,250,0.45)",
                  }}
                />
              </div>
              <span className="w-12 text-right font-mono text-[10px]">
                {p.gapRatio}×
              </span>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* Section 4 */}
      <ReportSection
        locked={!isPro}
        title={SECTION_TITLES[3]}
        preview={sectionLockPreview(4, data)}
      >
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sectionCaption(4, data)}
        </p>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={data.mirrorTimeline}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                tickFormatter={(v) => String(v).slice(2)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0e1a",
                  border: "1px solid rgba(167,139,250,0.3)",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="self"
                name={data.number}
                stroke="#A78BFA"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="mirror"
                name={data.mirrorNumber}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>

      {/* Section 5 */}
      <ReportSection
        locked={!isPro}
        title={SECTION_TITLES[4]}
        preview={sectionLockPreview(5, data)}
      >
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sectionCaption(5, data)}
        </p>
        <div className="flex items-end gap-4" style={{ height: 80 }}>
          <BarCompare
            label="开出前30天"
            value={data.preHitPattern.preHitTailMean}
            max={Math.max(data.preHitPattern.preHitTailMean, data.preHitPattern.baselineTailMean, 0.01)}
          />
          <BarCompare
            label="全历史基线"
            value={data.preHitPattern.baselineTailMean}
            max={Math.max(data.preHitPattern.preHitTailMean, data.preHitPattern.baselineTailMean, 0.01)}
          />
        </div>
        <p className="mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          尾数 {data.number[3]} 占全部开出号码比例(样本 {data.preHitPattern.sampleHits} 次)
        </p>
      </ReportSection>

      {/* Section 6 */}
      <ReportSection
        locked={!isPro}
        title={SECTION_TITLES[5]}
        preview={sectionLockPreview(6, data)}
      >
        <p className="mb-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {sectionCaption(6, data)}
        </p>
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={data.scoreTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                tickFormatter={(v) => String(v).slice(5)}
              />
              <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} width={28} />
              <Tooltip
                contentStyle={{
                  background: "#0a0e1a",
                  border: "1px solid rgba(167,139,250,0.3)",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#A78BFA"
                strokeWidth={2}
                dot={{ r: 3, fill: "#A78BFA" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>

      {!isPro && (
        <section
          className="mt-8 rounded-xl p-4 text-center"
          style={{
            border: "1px dashed rgba(167,139,250,0.35)",
            background: "rgba(167,139,250,0.06)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "#A78BFA" }}>
            Pro 解锁完整报告
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            运营商拆解 · 同冷度排名 · 镜像曲线 · 开出前形态 · 评分轨迹
          </p>
          <Link
            href="/pro"
            className="mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold"
            style={{
              background: "rgba(167,139,250,0.2)",
              border: "1px solid rgba(167,139,250,0.45)",
              color: "#A78BFA",
              textDecoration: "none",
            }}
          >
            {t("vyraBriefUnlockPro")}
          </Link>
        </section>
      )}

      <footer className="mt-8 space-y-2 text-xs" style={{ color: "var(--text-dim)" }}>
        <p>{t("vyraBriefFootnote1")}</p>
        <p>{t("vyraBriefFootnote2")}</p>
      </footer>
    </div>
  );
}

function ReportSection({
  title,
  locked,
  preview,
  children,
}: {
  title: string;
  locked: boolean;
  preview?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative mb-8">
      <h2
        className="mb-2 text-sm font-bold tracking-wide"
        style={{ color: "#A78BFA" }}
      >
        {title}
      </h2>
      {locked && preview && (
        <p className="mb-2 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          {title} · {preview}
        </p>
      )}
      <div
        className="relative rounded-xl p-4"
        style={{
          background: "rgba(167,139,250,0.04)",
          border: "1px solid rgba(167,139,250,0.12)",
        }}
      >
        <div
          style={{
            filter: locked ? "blur(6px)" : "none",
            pointerEvents: locked ? "none" : "auto",
            userSelect: locked ? "none" : "auto",
          }}
        >
          {children}
        </div>
        {locked && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(7,7,16,0.45)" }}
          >
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              🔒 Pro
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function BarCompare({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div
        className="w-full rounded-t-md"
        style={{
          height: Math.max(8, pct * 0.7),
          background: "#A78BFA",
          opacity: 0.85,
        }}
      />
      <span className="font-mono text-[10px]" style={{ color: "#A78BFA" }}>
        {(value * 100).toFixed(1)}%
      </span>
      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </span>
    </div>
  );
}
