import type { DrawResultV2Row } from "@/lib/draw-results-v2";

const MAGNUM_BASE = "https://www.magnum4d.my";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
};

export interface MagnumPastDraw {
  DrawDate?: string;
  DrawID?: string;
  FirstPrize?: string;
  SecondPrize?: string;
  ThirdPrize?: string;
  [key: string]: string | boolean | undefined;
}

function isValid4d(n: string): boolean {
  return /^\d{4}$/.test(n);
}

/** DD/MM/YYYY → YYYY-MM-DD */
export function magnumDateToIso(drawDate: string): string | null {
  const m = drawDate.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function collectNumbered(
  row: MagnumPastDraw,
  prefix: string,
  max: number
): string[] {
  const out: string[] = [];
  for (let i = 1; i <= max; i++) {
    const v = String(row[`${prefix}${i}`] ?? "").trim();
    if (isValid4d(v)) out.push(v);
  }
  return out;
}

function parseMoney(raw: unknown): number | null {
  const n = parseFloat(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseMagnumDraw(
  row: MagnumPastDraw,
  source = "magnum4d.my"
): DrawResultV2Row | null {
  const draw_date = magnumDateToIso(String(row.DrawDate ?? ""));
  if (!draw_date) return null;

  const first = String(row.FirstPrize ?? "").trim();
  if (!isValid4d(first)) return null;

  const special_numbers = collectNumbered(row, "Special", 13);
  const consolation_numbers = collectNumbered(row, "Console", 10);

  const extra_data: Record<string, unknown> = {
    gold: {
      jackpot1: row.GoldJackpot1Amount,
      jackpot2: row.GoldJackpot2Amount,
      jackpot1_winner: row.GoldJackpot1Winner,
      jackpot2_winner: row.GoldJackpot2Winner,
    },
    life: {
      number1: row.LifeNum1,
      number2: row.LifeNum2,
      number3: row.LifeNum3,
      number4: row.LifeNum4,
      number5: row.LifeNum5,
      number6: row.LifeNum6,
      number7: row.LifeNum7,
      number8: row.LifeNum8,
      bonus1: row.LifeBonusNum1,
      bonus2: row.LifeBonusNum2,
    },
    jackpot: {
      jackpot1_amount: parseMoney(row.Jackpot1Amount),
      jackpot2_amount: parseMoney(row.Jackpot2Amount),
    },
  };

  return {
    draw_date,
    draw_no: String(row.DrawID ?? "").trim() || null,
    operator: "magnum",
    first_prize: first,
    second_prize: isValid4d(String(row.SecondPrize ?? ""))
      ? String(row.SecondPrize)
      : null,
    third_prize: isValid4d(String(row.ThirdPrize ?? ""))
      ? String(row.ThirdPrize)
      : null,
    special_numbers,
    consolation_numbers,
    extra_data,
    source,
  };
}

/** Past draws JSON API (Kentico; stable alternative to __NEXT_DATA__). */
export async function fetchMagnumDrawsBetween(
  startIso: string,
  endIso: string,
  limit = 800
): Promise<MagnumPastDraw[]> {
  const url = `${MAGNUM_BASE}/results/past/between-dates/${startIso}/${endIso}/${limit}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Magnum between-dates HTTP ${res.status}`);
  }
  const data = (await res.json()) as MagnumPastDraw[];
  return Array.isArray(data) ? data : [];
}

/** Try __NEXT_DATA__ when present (older Next.js pages). */
export function parseMagnumNextDataHtml(html: string): DrawResultV2Row[] {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!m) return [];
  try {
    const data = JSON.parse(m[1]) as Record<string, unknown>;
    const rows: DrawResultV2Row[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const o = node as MagnumPastDraw;
      if (o.DrawDate && o.FirstPrize) {
        const parsed = parseMagnumDraw(o);
        if (parsed) rows.push(parsed);
      }
      Object.values(node).forEach(walk);
    };
    walk(data);
    const seen = new Set<string>();
    return rows.filter((r) => {
      const k = `${r.draw_date}:${r.operator}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } catch {
    return [];
  }
}

export async function fetchMagnumDrawPageHtml(
  drawDateIso: string
): Promise<string> {
  const res = await fetch(
    `${MAGNUM_BASE}/results/draw-results?date=${drawDateIso}`,
    { headers: DEFAULT_HEADERS }
  );
  if (!res.ok) throw new Error(`Magnum page HTTP ${res.status}`);
  return res.text();
}

export async function fetchMagnumTodayDraw(): Promise<DrawResultV2Row | null> {
  const end = new Date().toISOString().slice(0, 10);
  const rows = await fetchMagnumDrawsBetween(end, end, 3);
  const parsed = rows
    .map((r) => parseMagnumDraw(r))
    .filter((r): r is DrawResultV2Row => r != null);
  return parsed[0] ?? null;
}
