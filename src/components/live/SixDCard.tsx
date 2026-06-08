"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { StatusTag } from "@/components/ui/StatusTag";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, Toto6DTier } from "@/types";

interface SixDCardProps {
  displayName: string;
  subtitle?: string;
  date: string;
  draw_no?: string;
  status: DrawStatus;
  tiers: Toto6DTier[];
}

export function SixDCard({
  displayName,
  subtitle,
  date,
  draw_no,
  status,
  tiers,
}: SixDCardProps) {
  const { t } = useLang();
  const revealed = status !== "pending";
  const tierBox = revealed
    ? "font-mono font-bold font-number text-xl text-center flex-1 min-w-0 bg-surface-3 border border-line rounded py-2 text-foreground tracking-wide"
    : "font-mono font-bold font-number text-xl text-center flex-1 min-w-0 bg-surface-3/60 border border-line/70 rounded py-2 text-muted opacity-70 tracking-wide";

  return (
    <article className="subpage-card overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-line bg-surface-3">
        <LogoBadge operator="toto_6d" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
          <p className="text-[10px] text-muted">{subtitle ?? t("bothSidesWin")}</p>
        </div>
        <StatusTag status={status} />
      </header>
      <section className="divide-y divide-border">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className="flex flex-row items-center gap-2 px-3 py-2"
          >
            <span className="text-xs text-muted w-12 shrink-0">{tier.label}</span>
            <span className={tierBox}>
              {!revealed ? (
                "----"
              ) : tier.label === "1st" ? (
                tier.front
              ) : (
                <>
                  {tier.front}{" "}
                  <span className="text-muted text-sm font-sans font-normal">
                    OR
                  </span>{" "}
                  {tier.back}
                </>
              )}
            </span>
          </div>
        ))}
      </section>
      <footer className="flex justify-between px-3 py-2 text-[10px] text-dim border-t border-line">
        <span>{formatDrawDate(date)}</span>
        <span>{t("drawNoLabel")} {draw_no ?? "—"}</span>
      </footer>
    </article>
  );
}
