export function formatCurrency(
  amount: number,
  decimals = 0,
  currency = "RM"
): string {
  return `${currency} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function padNumber(num: string | number, digits: number): string {
  return String(num).padStart(digits, "0");
}

/** Format YYYY-MM-DD (or ISO) as DD/MM/YYYY without timezone shift */
export function formatDrawDate(date?: string | null): string {
  if (!date) return "—";
  const part = String(date).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
    return part.split("-").reverse().join("/");
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Header meta: (Sun) 31/05/2026 #375/26 */
export function formatDrawHeaderMeta(
  date?: string | null,
  drawNo?: string | null
): string {
  if (!date && !drawNo) return "—";
  if (!date) return drawNo ? `#${drawNo}` : "—";

  const part = String(date).split("T")[0];
  let wd = 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
    const [y, m, d] = part.split("-").map(Number);
    wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  } else {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      wd = parsed.getUTCDay();
    }
  }

  const dayName = DAY_SHORT[wd];
  const formatted = formatDrawDate(date);
  const no = drawNo ? ` #${drawNo}` : "";
  return `(${dayName}) ${formatted}${no}`;
}

export function formatTimeMYT(date: Date): string {
  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  });
}
