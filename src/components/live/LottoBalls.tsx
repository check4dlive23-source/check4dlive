"use client";

const BALL_BASE =
  "flex items-center justify-center rounded-full font-bold font-number";
const BONUS_BASE =
  "flex items-center justify-center rounded-md font-bold font-number";
const PENDING_BALL =
  "flex items-center justify-center rounded-full font-bold font-number opacity-70";

const EMPTY_SLOT_STYLE = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.2)",
} as const;

export function LottoBalls({
  balls,
  bonus,
  hasBonus,
  size = "md",
  revealed = true,
  slotCount = 6,
}: {
  balls: number[];
  bonus?: number | null;
  hasBonus: boolean;
  size?: "sm" | "md" | "lg";
  revealed?: boolean;
  slotCount?: number;
}) {
  const ballClass =
    size === "lg"
      ? `${BALL_BASE} h-12 w-12 text-lg`
      : size === "md"
      ? `${BALL_BASE} h-10 w-10 text-base`
      : `${BALL_BASE} h-8 w-8 text-sm`;

  const bonusClass =
    size === "lg"
      ? `${BONUS_BASE} h-12 w-12 text-lg`
      : size === "md"
      ? `${BONUS_BASE} h-10 w-10 text-base`
      : `${BONUS_BASE} h-8 w-8 text-sm`;

  const pendingSize =
    size === "lg" ? "h-12 w-12 text-sm"
    : size === "md" ? "h-10 w-10 text-sm"
    : "h-8 w-8 text-xs";

  const slots = Array.from({ length: slotCount }, (_, i) => balls[i] ?? null);

  if (!revealed) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 py-1">
        {slots.map((_, i) => (
          <span
            key={`p-${i}`}
            className={`${PENDING_BALL} ${pendingSize} text-[10px] tracking-tight`}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}
          >
            ----
          </span>
        ))}
        {hasBonus && (
          <>
            <span className="text-muted text-sm font-medium">+</span>
            <span
              className={`${PENDING_BALL} ${pendingSize} text-[10px] tracking-tight`}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}
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
      {slots.map((ball, i) => {
        const filled = ball != null && ball > 0;
        return (
          <span
            key={`${i}-${ball ?? "e"}`}
            className={ballClass}
            style={
              filled
                ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }
                : EMPTY_SLOT_STYLE
            }
          >
            {filled ? ball : "—"}
          </span>
        );
      })}
      {hasBonus && (
        <>
          <span className="text-muted text-sm font-medium">+</span>
          <span
            className={bonusClass}
            style={
              typeof bonus === "number" && bonus > 0
                ? { background: "rgba(255,176,32,0.15)", border: "2px solid #FFB020", color: "#FFB020" }
                : EMPTY_SLOT_STYLE
            }
          >
            {typeof bonus === "number" && bonus > 0 ? bonus : "—"}
          </span>
        </>
      )}
    </div>
  );
}
