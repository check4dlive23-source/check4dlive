"use client";

const BALL_BASE =
  "flex items-center justify-center rounded-full bg-surface-4 font-bold font-number text-foreground border border-line";

const BONUS_BASE =
  "flex items-center justify-center rounded-md bg-[#0d0d14] font-bold font-number text-gold border-2 border-gold";

/** Ball sizes: sm/md/lg — all rows centered with justify-center */
const PENDING_BALL =
  "flex items-center justify-center rounded-full bg-surface-3/60 font-bold font-number text-muted border border-line/70 opacity-70";

export function LottoBalls({
  balls,
  bonus,
  hasBonus,
  size = "md",
  revealed = true,
}: {
  balls: number[];
  bonus?: number | null;
  hasBonus: boolean;
  size?: "sm" | "md" | "lg";
  revealed?: boolean;
}) {
  const ballClass =
    size === "md" || size === "lg"
      ? `${BALL_BASE} h-12 w-12 text-lg`
      : `${BALL_BASE} h-11 w-11 text-base`;

  const bonusClass =
    size === "md" || size === "lg"
      ? `${BONUS_BASE} h-12 w-12 text-lg`
      : `${BONUS_BASE} h-11 w-11 text-base`;

  const pendingSize =
    size === "md" || size === "lg" ? "h-12 w-12 text-sm" : "h-11 w-11 text-sm";

  if (!revealed) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 py-1">
        {balls.map((_, i) => (
          <span
            key={`p-${i}`}
            className={`${PENDING_BALL} ${pendingSize} text-[10px] tracking-tight`}
          >
            ----
          </span>
        ))}
        {hasBonus && (
          <>
            <span className="text-muted text-sm font-medium">+</span>
            <span
              className={`${PENDING_BALL} ${pendingSize} text-[10px] tracking-tight`}
            >
              ----
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-1">
      {balls.map((ball, i) => (
        <span key={`${i}-${ball}`} className={ballClass}>
          {ball}
        </span>
      ))}
      {hasBonus && typeof bonus === "number" && (
        <>
          <span className="text-muted text-sm font-medium">+</span>
          <span className={bonusClass}>{bonus}</span>
        </>
      )}
    </div>
  );
}
