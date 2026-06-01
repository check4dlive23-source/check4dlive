"use client";

/** Ball size: compact = 32px (h-8 w-8), default = 36px */
export function LottoBalls({
  balls,
  bonus,
  hasBonus,
  size = "md",
}: {
  balls: number[];
  bonus?: number | null;
  hasBonus: boolean;
  size?: "sm" | "md";
}) {
  const ballClass =
    size === "sm"
      ? "flex h-8 w-8 items-center justify-center rounded-full bg-surface-4 text-xs font-number text-foreground border border-line"
      : "flex h-9 w-9 items-center justify-center rounded-full bg-surface-4 text-sm font-number text-foreground border border-line";

  const bonusClass =
    size === "sm"
      ? "flex h-8 w-8 items-center justify-center rounded-md bg-[#0d0d14] text-xs font-number text-gold border-2 border-gold"
      : "flex h-8 w-8 items-center justify-center rounded-md bg-[#0d0d14] text-sm font-number text-gold border-2 border-gold";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {balls.map((ball, i) => (
        <span key={`${i}-${ball}`} className={ballClass}>
          {ball}
        </span>
      ))}
      {hasBonus && typeof bonus === "number" && (
        <>
          <span className="text-muted text-xs">+</span>
          <span className={bonusClass}>{bonus}</span>
        </>
      )}
    </div>
  );
}
