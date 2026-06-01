"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { Damacai3Plus3DExtra, DrawStatus } from "@/types";

interface Damacai3Plus3DCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: Damacai3Plus3DExtra;
}

function SixDigitGrid({ numbers }: { numbers: string[] }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {numbers.map((n, i) => (
        <span
          key={`${n}-${i}`}
          className="font-number text-xs text-foreground text-center truncate"
        >
          {n}
        </span>
      ))}
    </div>
  );
}

export function Damacai3Plus3DCard({
  date,
  draw_no,
  status,
  data,
}: Damacai3Plus3DCardProps) {
  const revealed = status !== "pending";

  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden">
      <header
        className="flex items-center gap-2 px-2 py-2 border-b border-line"
        style={{ backgroundColor: "#1a3a8f18" }}
      >
        <LogoBadge operator="damacai" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            DA MA CAI 3+3D 大馬彩
          </h3>
        </div>
        <StatusTag status={status} />
      </header>

      <section className="p-2 border-b border-line overflow-x-auto">
        <table className="w-full text-xs">
          <tbody>
            {data.prizes.map((p) => (
              <tr key={p.position} className="border-b border-line/50 last:border-0">
                <td className="py-1 pr-2 text-muted whitespace-nowrap w-8">
                  {p.position}
                </td>
                <td
                  className={`py-1 pr-2 font-number text-sm whitespace-nowrap ${
                    revealed ? "text-foreground" : "text-dim"
                  }`}
                >
                  {revealed ? p.number : "—"}
                </td>
                <td className="py-1 pr-2 text-xs font-semibold text-gold whitespace-nowrap">
                  {p.zodiac}
                </td>
                <td className="py-1 text-xs text-muted whitespace-nowrap text-right">
                  Bonus:{" "}
                  <span className="font-number text-gold">
                    {revealed ? formatCurrency(p.bonus, 2) : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="p-2 border-b border-line">
        <p className="text-[10px] text-muted mb-1 uppercase">Special 特別獎</p>
        {revealed ? (
          <SixDigitGrid numbers={data.special} />
        ) : (
          <p className="text-dim text-xs font-number">—</p>
        )}
      </section>

      <section className="p-2 border-b border-line">
        <p className="text-[10px] text-muted mb-1 uppercase">
          Consolation 安慰獎
        </p>
        {revealed ? (
          <SixDigitGrid numbers={data.consolation} />
        ) : (
          <p className="text-dim text-xs font-number">—</p>
        )}
      </section>

      <footer className="flex justify-between px-2 py-1.5 text-[10px] text-dim">
        <span>期号 {draw_no ?? "—"}</span>
        <span>{formatDrawDate(date)}</span>
      </footer>
    </article>
  );
}
