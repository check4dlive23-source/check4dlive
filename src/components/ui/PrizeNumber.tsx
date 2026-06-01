"use client";

interface PrizeNumberProps {
  value?: string | null;
  size?: "sm" | "md" | "lg";
  revealed?: boolean;
}

function isEmptyPrize(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  return v === "—" || v === "----" || v === "****";
}

export function PrizeNumber({
  value,
  size = "lg",
  revealed = true,
}: PrizeNumberProps) {
  const sizeClass =
    size === "lg"
      ? "text-[28px] md:text-[32px] tracking-[2px]"
      : size === "md"
        ? "text-lg tracking-[1px]"
        : "text-sm tracking-wide";

  if (!revealed || isEmptyPrize(value)) {
    return (
      <span className={`font-number text-dim ${sizeClass}`}>—</span>
    );
  }

  return (
    <span className={`font-number text-foreground ${sizeClass}`}>{value}</span>
  );
}
