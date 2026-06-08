"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { useLang } from "@/lib/language-context";
import { formatCurrency, formatDrawDate } from "@/lib/number-utils";
import type { Jackpot4DResult } from "@/types";

interface JackpotCardProps {
  data: Jackpot4DResult;
}

export function JackpotCard({ data }: JackpotCardProps) {
  const { t } = useLang();

  return (
    <article className="subpage-card overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-line bg-surface-3">
        <LogoBadge operator={data.operator} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            {data.displayName}
          </h3>
          <p className="text-[10px] text-muted">
            {t("jackpotHint")}
          </p>
        </div>
        <StatusTag status={data.status} />
      </header>

      <section className="px-3 py-4 space-y-3 border-b border-line">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted">4D Jackpot 1</span>
          <span className="font-number text-lg text-gold">
            {formatCurrency(data.jackpot1_amount)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted">4D Jackpot 2</span>
          <span className="font-number text-lg text-gold">
            {formatCurrency(data.jackpot2_amount)}
          </span>
        </div>
      </section>

      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim">
        <span>{t("drawNoLabel")} {data.draw_no ?? "—"}</span>
        <span>{formatDrawDate(data.date)}</span>
      </footer>
    </article>
  );
}
