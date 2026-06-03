"use client";

interface PrizeNumberProps {
  value?: string | null;
  size?: "sm" | "md" | "lg";
  revealed?: boolean;
}

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  return v === "—" || v === "-" || v === "." || v === "----" || v === "****";
}

const sizeStyles = {
  lg: {
    text: "text-2xl md:text-[2rem] tracking-[0.12em]",
    box: "min-h-[2.75rem]",
  },
  md: {
    text: "text-xl tracking-wide",
    box: "min-h-[2.25rem]",
  },
  sm: {
    text: "text-base md:text-lg tracking-wide",
    box: "min-h-[2rem]",
  },
} as const;

function prizeBoxClass(size: "sm" | "md" | "lg", extra = "") {
  const s = sizeStyles[size];
  return [
    "inline-flex w-full items-center justify-center",
    "rounded border border-line bg-surface-3/60",
    "px-1 py-0.5 text-center",
    "font-mono font-bold font-number",
    s.text,
    s.box,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function PrizeNumber({
  value,
  size = "lg",
  revealed = true,
}: PrizeNumberProps) {
  if (isPlaceholder(value)) {
    return (
      <span
        className={prizeBoxClass(size, "text-muted border-line/70 opacity-70")}
        aria-label="Empty prize slot"
      >
        ----
      </span>
    );
  }

  if (!revealed) {
    return (
      <span
        className={prizeBoxClass(size, "invisible text-transparent select-none")}
        aria-hidden
      >
        ----
      </span>
    );
  }

  return (
    <span className={prizeBoxClass(size, "text-foreground")}>{value}</span>
  );
}
