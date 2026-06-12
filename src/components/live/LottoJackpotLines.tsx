"use client";

import { formatCurrency } from "@/lib/number-utils";
import type { LottoBallResult } from "@/types";

function jackpot2Note(ballCount: number): string {
  if (ballCount === 5) return "Jackpot 2 = 4个主球 + Bonus";
  return "Jackpot 2 = 5个主球 + Bonus";
}

function prizeLabels(data: LottoBallResult): { first: string; second: string } {
  if (data.operator === "sgpools") {
    return { first: "Group 1", second: "Group 2" };
  }
  return { first: "Jackpot 1", second: "Jackpot 2" };
}

interface LottoJackpotLinesProps {
  data: LottoBallResult;
  compact?: boolean;
  /** Larger jackpot text for mobile lotto cards */
  readable?: boolean;
}

export function LottoJackpotLines({
  data,
  compact = false,
  readable = false,
}: LottoJackpotLinesProps) {
  const textSize = readable ? "text-sm" : compact ? "text-[10px]" : "text-xs";
  const noteSize = readable ? "text-xs" : compact ? "text-[9px]" : "text-[10px]";
  const { first, second } = prizeLabels(data);
  const currency = data.currency ?? "RM";

  if (
    data.hasBonus &&
    data.jackpot1_amount != null &&
    data.jackpot2_amount != null
  ) {
    return (
      <div className={`space-y-0.5 ${textSize}`}>
        <p className="text-foreground leading-snug">
          <span className="text-muted">{first}:</span>{" "}
          <span className="font-number text-gold">
            {formatCurrency(data.jackpot1_amount, 2, currency)}
          </span>
          <span className="text-dim mx-1.5">|</span>
          <span className="text-muted">{second}:</span>{" "}
          <span className="font-number text-gold">
            {formatCurrency(data.jackpot2_amount, 2, currency)}
          </span>
        </p>
        <p className={`${noteSize} text-dim`}>
          {jackpot2Note(data.balls.length)}
        </p>
      </div>
    );
  }

  if (data.jackpot_amount != null) {
    return (
      <p className={`${textSize} text-foreground`}>
        <span className="text-muted">Jackpot:</span>{" "}
        <span className="font-number text-gold">
          {formatCurrency(data.jackpot_amount, 2, currency)}
        </span>
      </p>
    );
  }

  if (data.jackpot1_amount != null && !data.jackpot2_amount) {
    return (
      <p className={`${textSize} text-foreground`}>
        <span className="text-muted">{first}:</span>{" "}
        <span className="font-number text-gold">
          {formatCurrency(data.jackpot1_amount, 2, currency)}
        </span>
      </p>
    );
  }

  return null;
}
