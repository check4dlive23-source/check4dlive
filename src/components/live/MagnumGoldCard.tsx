"use client";

import type { ReactNode } from "react";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, MagnumGoldExtra } from "@/types";

interface MagnumGoldCardProps {
  date: string;
  draw_no?: string;
  status: DrawStatus;
  data: MagnumGoldExtra;
}

function DigitCell({ value, revealed }: { value: string; revealed: boolean }) {
  const empty = value === "" || value === " ";
  const dimmed = !revealed;
  return (
    <span
      className={`inline-flex h-10 w-9 items-center justify-center rounded border font-number text-base font-bold ${
        dimmed
          ? "border-line/70 bg-surface-3/60 text-muted opacity-70"
          : empty
            ? "border-line/50 bg-surface-3/50 text-dim"
            : "border-line bg-surface-4 text-foreground"
      }`}
    >
      {dimmed ? "—" : empty ? " " : value}
    </span>
  );
}

function DigitRow({
  digits,
  bonus,
  revealed,
}: {
  digits: string[];
  bonus: string[];
  revealed: boolean;
}) {
  const d = revealed ? digits : digits.map(() => "");
  const b = revealed ? bonus : bonus.map(() => "");
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {d.map((digit, i) => (
        <DigitCell key={`d-${i}`} value={digit} revealed={revealed} />
      ))}
      <span className="text-muted text-xs px-0.5">+</span>
      {b.map((digit, i) => (
        <DigitCell key={`b-${i}`} value={digit} revealed={revealed} />
      ))}
    </div>
  );
}

function PrizeBlock({
  title,
  children,
  prize,
  revealed,
}: {
  title: string;
  children: ReactNode;
  prize?: number;
  revealed: boolean;
}) {
  const { t } = useLang();

  return (
    <div className="px-2.5 py-2 border-b border-line space-y-1.5">
      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
        {title}
      </p>
      {children}
      {prize != null && (
        <p className="text-sm text-gold font-number">
          {t("prizeLabel")}:{" "}
          {revealed ? formatCurrency(prize, 2) : "—"}
        </p>
      )}
    </div>
  );
}

export function MagnumGoldCard({
  date,
  draw_no,
  status,
  data,
}: MagnumGoldCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";

  return (
    <article className="subpage-card overflow-hidden min-w-0">
      <header
        className="flex items-center gap-2 px-3 py-2.5 border-b border-line"
        style={{ backgroundColor: "#FFD70018" }}
      >
        <LogoBadge operator="magnum_jg" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Magnum Jackpot Gold
          </h3>
        </div>
        <StatusTag status={status} />
      </header>

      <PrizeBlock title="Jackpot 1" prize={data.jackpot1.prize} revealed={revealed}>
        <DigitRow
          digits={data.jackpot1.digits}
          bonus={data.jackpot1.bonus}
          revealed={revealed}
        />
      </PrizeBlock>

      <PrizeBlock title="Jackpot 2" prize={data.jackpot2.prize} revealed={revealed}>
        <div className="space-y-2">
          {data.jackpot2.variations.map((v, i) => (
            <div key={i}>
              {i > 0 && (
                <p className="text-[10px] text-muted text-center py-1">OR</p>
              )}
              <DigitRow digits={v.digits} bonus={v.bonus} revealed={revealed} />
            </div>
          ))}
        </div>
      </PrizeBlock>

      <section className="px-2.5 py-1.5 divide-y divide-line border-b border-line">
        {data.subPrizes.map((p) => (
          <div
            key={p.label}
            className="flex justify-between items-center py-2 text-sm"
          >
            <span className="text-muted">{p.label}</span>
            <span className="font-number text-gold">
              {revealed ? formatCurrency(p.amount) : "—"}
            </span>
          </div>
        ))}
      </section>

      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim">
        <span>{formatDrawDate(date)}</span>
        <span>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
