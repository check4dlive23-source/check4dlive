"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { PrizeNumber } from "@/components/ui/PrizeNumber";
import { StatusTag } from "@/components/ui/StatusTag";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawHeaderMeta } from "@/lib/number-utils";
import {
  CONSOLATION_SLOT_COUNT,
  padPrizeSlots,
  specialSlotCount,
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
  const brand = brandColors[data.operator];
  const spCount = specialSlotCount(data.operator);
  const specialSlots = padPrizeSlots(data.special_numbers, spCount);
  const consolationSlots = padPrizeSlots(
    data.consolation_numbers,
    CONSOLATION_SLOT_COUNT
  );
  const revealed = data.status !== "pending";

  const showZodiac =
    revealed && data.operator === "toto" && Boolean(data.zodiac);

  const showJackpot =
    revealed &&
    (data.operator === "magnum" ||
      data.operator === "damacai" ||
      data.operator === "toto") &&
    data.jackpot1_amount != null;

  return (
    <article className="rounded-xl border border-line bg-surface-2 overflow-hidden">
      <header
        className="flex items-start gap-2 px-2 py-1.5 border-b border-line"
        style={{ backgroundColor: `${brand}18` }}
      >
        <LogoBadge operator={data.operator} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {data.displayName}
          </h3>
          <p className="text-[10px] text-muted truncate mt-0.5">
            {formatDrawHeaderMeta(data.date, data.draw_no)}
          </p>
        </div>
        <StatusTag status={data.status} />
      </header>

      <div className="grid grid-cols-3 border-b border-line bg-surface-3 text-center text-[10px] text-muted">
        <div className="py-1.5 border-r border-line">{t("firstPrize")}</div>
        <div className="py-1.5 border-r border-line">{t("secondPrize")}</div>
        <div className="py-1.5">{t("thirdPrize")}</div>
      </div>
      <div className="grid grid-cols-3 border-b border-line text-center py-1.5">
        <div className="border-r border-line flex flex-col items-center gap-0.5">
          <PrizeNumber value={data.first_prize} revealed={revealed} />
          {showZodiac && (
            <span className="text-[10px] text-gold">{data.zodiac}</span>
          )}
        </div>
        <div className="border-r border-line">
          <PrizeNumber value={data.second_prize} revealed={revealed} />
        </div>
        <div>
          <PrizeNumber value={data.third_prize} revealed={revealed} />
        </div>
      </div>

      <section className="px-2 py-1.5 border-b border-line">
        <p className="text-[10px] text-muted mb-1.5 uppercase tracking-wider">
          {t("specialSection")}
        </p>
        <div className="grid grid-cols-5 gap-1">
          {specialSlots.map((n, i) => (
            <PrizeNumber key={`sp-${i}`} value={n} size="sm" revealed={revealed} />
          ))}
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
