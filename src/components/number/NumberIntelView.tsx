import dynamic from "next/dynamic";
import Link from "next/link";

const AppearanceTimeline = dynamic(
  () => import("./AppearanceTimeline").then((m) => m.AppearanceTimeline),
  { ssr: false, loading: () => (
    <div className="h-64 flex items-center justify-center text-sm text-muted">
      Loading chart…
    </div>
  ) }
);
import { HeatBadge } from "./HeatBadge";
import { NumberSearchBar } from "./NumberSearchBar";
import { formatDrawDate } from "@/lib/number-utils";
import { parsePosition } from "@/lib/number-intelligence";
import type { NumberIntelligenceResponse } from "@/types/number-intelligence";

const POSITION_COLORS: Record<string, string> = {
  first: "text-gold",
  second: "text-slate-300",
  third: "text-amber-700",
  special: "text-sky-400",
  consolation: "text-muted",
};

const OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Sports Toto",
  sabah: "Sabah",
  sarawak: "Cash Sweep",
  sandakan: "Sandakan",
  gd: "Grand Dragon",
  perdana: "Perdana",
  hari: "Lucky Hari Hari",
  sgpools: "Singapore Pools",
};

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-3 px-3 py-2 text-center">
      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
      <p className="font-number text-lg text-foreground mt-0.5">{value}</p>
    </div>
  );
}

interface NumberIntelViewProps {
  data: NumberIntelligenceResponse;
}

export function NumberIntelView({ data }: NumberIntelViewProps) {
  const { stats } = data;
  const lastPos = stats.last_seen_position
    ? parsePosition(stats.last_seen_position).label
    : "—";
  const lastOp = stats.last_seen_operator
    ? OPERATOR_LABELS[stats.last_seen_operator] ?? stats.last_seen_operator
    : "—";

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-surface-2">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            href="/"
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            ← Check4D Live
          </Link>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                Number Intelligence
              </p>
              <h1 className="font-number text-5xl md:text-6xl font-bold text-gold tracking-[0.2em]">
                {data.number}
              </h1>
            </div>
            <HeatBadge level={stats.heat_level} />
          </div>
          <div className="mt-4">
            <NumberSearchBar currentNumber={data.number} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-8">
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCell label="Total hits" value={stats.total_hits} />
            <StatCell label="1st Prize" value={stats.first_prize_hits} />
            <StatCell label="2nd Prize" value={stats.second_prize_hits} />
            <StatCell label="3rd Prize" value={stats.third_prize_hits} />
            <StatCell label="Special" value={stats.special_hits} />
            <StatCell label="Consolation" value={stats.consolation_hits} />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="text-muted">Last seen: </span>
              <span className="text-foreground">
                {stats.last_seen_date
                  ? `${formatDrawDate(stats.last_seen_date)} · ${lastOp} · ${lastPos}`
                  : "Never"}
              </span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="text-muted">Current gap: </span>
              <span className="text-foreground font-number">
                {stats.current_gap_days != null
                  ? `${stats.current_gap_days} days`
                  : "—"}
              </span>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="text-muted">Average gap: </span>
              <span className="text-foreground font-number">
                {stats.avg_gap_days != null
                  ? `${stats.avg_gap_days} days`
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Appearance timeline (24 months)
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <AppearanceTimeline data={data.timeline} />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Breakdown by operator
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            {data.breakdown.length === 0 ? (
              <p className="p-4 text-sm text-muted">No appearances recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2">Operator</th>
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-center">1st</th>
                    <th className="px-3 py-2 text-center">2nd</th>
                    <th className="px-3 py-2 text-center">3rd</th>
                    <th className="px-3 py-2 text-center">Special</th>
                    <th className="px-3 py-2 text-center">Cons.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((row) => (
                    <tr key={row.operator} className="border-b border-line/50">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-center font-number">
                        {row.total}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-gold">
                        {row.first}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-slate-300">
                        {row.second}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-amber-600">
                        {row.third}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-sky-400">
                        {row.special}
                      </td>
                      <td className="px-3 py-2 text-center font-number text-muted">
                        {row.consolation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Recent appearances
          </h2>
          <div className="rounded-xl border border-line bg-surface-2 overflow-x-auto">
            {data.recent.length === 0 ? (
              <p className="p-4 text-sm text-muted">No recent history.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted text-xs uppercase">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Operator</th>
                    <th className="px-3 py-2">Prize position</th>
                    <th className="px-3 py-2">Draw no.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row, i) => (
                    <tr
                      key={`${row.date}-${row.operator}-${i}`}
                      className="border-b border-line/50"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {formatDrawDate(row.date)}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {OPERATOR_LABELS[row.operator] ?? row.operator}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          POSITION_COLORS[row.position_tier]
                        }`}
                      >
                        {row.position_label}
                      </td>
                      <td className="px-3 py-2 font-number text-muted">
                        {row.draw_no ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
