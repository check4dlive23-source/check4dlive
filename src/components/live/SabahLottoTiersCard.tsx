"use client";

import { LogoBadge } from "@/components/ui/LogoBadge";
import { useLang } from "@/lib/language-context";
import { formatDrawDate } from "@/lib/number-utils";
import type { DrawStatus, SabahLottoTier } from "@/types";
import { NoLiveDataPlaceholder } from "./NoLiveDataPlaceholder";

interface SabahLottoTiersCardProps {
  title: string;
  tiers: SabahLottoTier[] | null;
  date: string;
  draw_no?: string;
  status: DrawStatus;
}

const PENDING_SLOT_STYLE = {
  fontSize: 8,
  fontWeight: 600,
  textAlign: "center" as const,
  letterSpacing: "-0.04em",
  color: "rgba(255,255,255,0.1)",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 4,
};

function PendingDigitSlot() {
  return (
    <span
      className="font-mono tabular-nums shrink-0 flex items-center justify-center"
      style={{ ...PENDING_SLOT_STYLE, width: 22, height: 24, lineHeight: "24px" }}
    >
      ----
    </span>
  );
}

function PendingBonusSlot() {
  return (
    <span
      className="font-mono tabular-nums shrink-0 flex items-center justify-center"
      style={{ ...PENDING_SLOT_STYLE, width: 24, height: 24, borderRadius: 6 }}
    >
      ----
    </span>
  );
}

function LiveWaitingTiers({ title }: { title: string }) {
  const isLotto6 = title.includes("Lotto 6");
  const digitCount = isLotto6 ? 5 : 4;
  const tierCount = isLotto6 ? 5 : 8;

  return (
    <section style={{ padding: "8px 12px 10px", overflowX: "auto" }}>
      {Array.from({ length: tierCount }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 min-w-0"
          style={{
            padding: "5px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span
            className="shrink-0 font-mono"
            style={{
              width: 58,
              fontSize: 9,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.04em",
            }}
          >
            Jackpot {index + 1}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            {Array.from({ length: digitCount }, (_, i) => (
              <PendingDigitSlot key={i} />
            ))}
          </div>
          <span className="text-muted shrink-0" style={{ fontSize: 10, fontWeight: 500 }}>
            +
          </span>
          <PendingBonusSlot />
          <span
            className="font-number shrink-0 ml-auto text-right truncate"
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.1)",
              maxWidth: "38%",
              minWidth: 0,
            }}
          >
            ----
          </span>
        </div>
      ))}
    </section>
  );
}

function isFilledDigit(v: string): boolean {
  const s = v.trim();
  return s !== "" && s !== "----";
}

function DigitCell({ digit }: { digit: string }) {
  const filled = isFilledDigit(digit);
  return (
    <span
      className="font-mono tabular-nums shrink-0"
      style={{
        fontSize: 11,
        fontWeight: 600,
        textAlign: "center",
        width: 22,
        height: 24,
        lineHeight: "24px",
        background: filled ? "rgba(0,229,255,0.05)" : "transparent",
        border: filled ? "1px solid rgba(0,229,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
        borderRadius: 4,
        color: filled ? "var(--cyan)" : "rgba(255,255,255,0.1)",
      }}
    >
      {filled ? digit : "—"}
    </span>
  );
}

function BonusBadge({ bonus }: { bonus: string }) {
  const filled = isFilledDigit(bonus);
  return (
    <span
      className="font-mono tabular-nums shrink-0 flex items-center justify-center"
      style={{
        width: 24,
        height: 24,
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 6,
        background: filled ? "rgba(255,176,32,0.15)" : "rgba(255,255,255,0.03)",
        border: filled ? "2px solid #FFB020" : "1px solid rgba(255,255,255,0.08)",
        color: filled ? "#FFB020" : "rgba(255,255,255,0.2)",
      }}
    >
      {filled ? bonus : "—"}
    </span>
  );
}

function TierRow({ tier, index }: { tier: SabahLottoTier; index: number }) {
  const prize = tier.prize.trim();
  return (
    <div
      className="flex items-center gap-1.5 min-w-0"
      style={{
        padding: "5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span
        className="shrink-0 font-mono"
        style={{
          width: 58,
          fontSize: 9,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.04em",
        }}
      >
        Jackpot {index + 1}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        {tier.numbers.map((d, i) => (
          <DigitCell key={i} digit={d} />
        ))}
      </div>
      <span className="text-muted shrink-0" style={{ fontSize: 10, fontWeight: 500 }}>
        +
      </span>
      <BonusBadge bonus={tier.bonus} />
      <span
        className="font-number shrink-0 ml-auto text-right truncate"
        style={{
          fontSize: 10,
          color: "#FFD700",
          maxWidth: "38%",
          minWidth: 0,
        }}
        title={prize || undefined}
      >
        {prize || "—"}
      </span>
    </div>
  );
}

export function SabahLottoTiersCard({
  title,
  tiers,
  date,
  draw_no,
  status,
}: SabahLottoTiersCardProps) {
  const { t } = useLang();
  const hasTiers = Boolean(tiers && tiers.length > 0);

  return (
    <article
      style={{
        background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
        border: "1px solid rgba(180,83,9,0.2)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, transparent)" }} />
      <header
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(180,83,9,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <LogoBadge operator="sabah" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{title}</h3>
        </div>
        <span
          className="shrink-0"
          style={{
            fontSize: 9,
            color: "#00E5FF",
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 100,
            padding: "3px 8px",
            fontFamily: "var(--font-jetbrains)",
            letterSpacing: "0.1em",
          }}
        >
          {status === "drawn"
            ? t("completed")
            : status === "live"
              ? t("liveDrawing")
              : t("noLiveData")}
        </span>
      </header>
      {hasTiers ? (
        <section style={{ padding: "8px 12px 10px", overflowX: "auto" }}>
          {tiers!.map((tier, i) => (
            <TierRow key={i} tier={tier} index={i} />
          ))}
        </section>
      ) : status === "live" ? (
        <LiveWaitingTiers title={title} />
      ) : (
        <NoLiveDataPlaceholder />
      )}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          {formatDrawDate(date)}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          {t("drawNoLabel")} {draw_no ?? "—"}
        </span>
      </footer>
    </article>
  );
}
