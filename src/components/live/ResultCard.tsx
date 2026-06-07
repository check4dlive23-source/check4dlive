"use client";

import { useEffect, useState } from "react";
import { todayMYT } from "@/lib/draw-time";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { PrizeNumber } from "@/components/ui/PrizeNumber";
import { StatusTag } from "@/components/ui/StatusTag";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import {
  CONSOLATION_SLOT_COUNT,
  getSpecialCount,
  padPrizeSlots,
} from "@/lib/prize-slots";
import type { DrawResult, OperatorId } from "@/types";

const brandColors: Record<OperatorId, string> = {
  magnum: "#FFD700",
  damacai: "#1a3a8f",
  toto: "#CC0000",
  sabah: "#b45309",
  sarawak: "#0e7490",
  sandakan: "#4c1d95",
  gd: "#b91c1c",
  perdana: "#5b21b6",
  hari: "#065f46",
  sgpools: "#9d174d",
};

interface ResultCardProps {
  data: DrawResult;
}

export function ResultCard({ data }: ResultCardProps) {
  const { t } = useLang();
  const operator = data.operator;
  const brand = brandColors[operator];
  const spCount = getSpecialCount(operator);
  const specialSlots = padPrizeSlots(data.special_numbers, spCount);
  const specialFirstRow = specialSlots.slice(0, 10);
  const specialLastRow = spCount > 10 ? specialSlots.slice(10) : [];
  const consolationSlots = padPrizeSlots(
    data.consolation_numbers,
    CONSOLATION_SLOT_COUNT
  );
  const revealed = data.status !== "pending";
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(todayMYT());
  }, []);

  const isTodayPending =
    data.status === "pending" && Boolean(today) && data.date === today;

  const showZodiac =
    revealed && operator === "toto" && Boolean(data.zodiac);

  const showJackpot =
    revealed &&
    (operator === "magnum" ||
      operator === "damacai" ||
      operator === "toto") &&
    (data.jackpot1_amount ?? 0) > 0;

  return (
    <article className="subpage-card overflow-hidden">
      <header
        className="flex items-start gap-2 px-2 py-1.5 border-b border-line"
        style={{ backgroundColor: `${brand}18` }}
      >
        <LogoBadge operator={data.operator} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {data.displayName}
          </h3>
          <div className="flex items-center justify-between text-[10px] text-muted mt-0.5">
            <span>{formatDrawDate(data.date)}</span>
            <span>{data.draw_no ?? "—"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <StatusTag status={data.status} />
          {isTodayPending && (
            <span className="text-[9px] text-muted whitespace-nowrap">
              今日等待开彩
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 border-b border-line bg-surface-3 text-center text-[10px] text-muted">
        <div className="py-1.5 border-r border-line">{t("firstPrize")}</div>
        <div className="py-1.5 border-r border-line">{t("secondPrize")}</div>
        <div className="py-1.5">{t("thirdPrize")}</div>
      </div>
      <div className="grid grid-cols-3 border-b border-line text-center py-1.5">
        <div className="border-r border-line flex flex-col items-center gap-0.5 px-1">
          <PrizeNumber value={data.first_prize} size="lg" revealed={revealed} />
          {showZodiac && (
            <span className="text-[10px] text-gold">{data.zodiac}</span>
          )}
        </div>
        <div className="border-r border-line px-1">
          <PrizeNumber value={data.second_prize} size="lg" revealed={revealed} />
        </div>
        <div className="px-1">
          <PrizeNumber value={data.third_prize} size="lg" revealed={revealed} />
        </div>
      </div>

      <section className="px-2 py-1.5 border-b border-line">
        <p className="text-[10px] text-muted mb-1.5 uppercase tracking-wider">
          {t("specialSection")}
        </p>
        <div className="space-y-1">
          <div className="grid grid-cols-5 gap-1">
            {specialFirstRow.map((n, i) => (
              <PrizeNumber
                key={`sp-${i}`}
                value={n}
                size="sm"
                revealed={revealed}
              />
            ))}
          </div>
          {specialLastRow.length > 0 && (
            <div className="grid grid-cols-5 gap-1">
              {specialLastRow.map((n, i) => (
                <div key={`sp-last-${i}`} className={i === 0 ? "col-start-2" : ""}>
                  <PrizeNumber value={n} size="sm" revealed={revealed} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-2 py-1.5 border-b border-line">
        <p className="text-[10px] text-muted mb-1.5 uppercase tracking-wider">
          {t("consolationSection")}
        </p>
        <div className="grid grid-cols-5 gap-1">
          {consolationSlots.map((n, i) => (
            <PrizeNumber key={`cn-${i}`} value={n} size="sm" revealed={revealed} />
          ))}
        </div>
      </section>

      {showJackpot && (
        <section className="px-2 py-1.5 border-b border-line space-y-1">
          {data.jackpot1_amount != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("jackpot1")}</span>
              <span className="font-number text-gold">
                {formatCurrency(data.jackpot1_amount)}
              </span>
            </div>
          )}
          {data.jackpot2_amount != null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("jackpot2")}</span>
              <span className="font-number text-gold">
                {formatCurrency(data.jackpot2_amount)}
              </span>
            </div>
          )}
        </section>
      )}
    </article>
  );
}
