import type { DrawResultV2Row } from "@/lib/draw-results-v2";

const DAMACAI_HOME = "https://www.damacai.com.my/home";
const LIST_PAST = "https://www.damacai.com.my/ListPastResult";
const PASS_RESULT = "https://www.damacai.com.my/callpassresult";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
};

let cookieSession = "1";

function isValid4d(n: string): boolean {
  return /^\d{4}$/.test(n);
}

function normalizeList(values: unknown, max = 10): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => String(v ?? "").trim())
    .filter((v) => isValid4d(v))
    .slice(0, max);
}

/** DD/MM/YYYY → YYYY-MM-DD */
export function damacaiDateToIso(drawDate: string): string | null {
  const m = drawDate.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** YYYYMMDD → YYYY-MM-DD */
export function ymdToIso(ymd: string): string | null {
  const s = ymd.trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

async function damacaiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      cookiesession: cookieSession,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const m = setCookie.match(/cookiesession=(\d+)/i);
    if (m) cookieSession = m[1];
  }
  return res;
}

/** Warm session (optional; ListPastResult works without home). */
export async function initDamacaiSession(): Promise<void> {
  try {
    await fetch(DAMACAI_HOME, { headers: DEFAULT_HEADERS });
  } catch {
    /* non-fatal */
  }
}

export async function fetchDamacaiPastDateYmds(): Promise<string[]> {
  await initDamacaiSession();
  const res = await damacaiFetch(LIST_PAST);
  if (!res.ok) throw new Error(`ListPastResult HTTP ${res.status}`);
  const data = (await res.json()) as { drawdate?: string };
  if (!data.drawdate) return [];
  return data.drawdate.trim().split(/\s+/).filter((d) => /^\d{8}$/.test(d));
}

export async function fetchDamacaiDrawJson(
  pastDateYmd: string
): Promise<Record<string, unknown> | null> {
  const res = await damacaiFetch(
    `${PASS_RESULT}?pastdate=${encodeURIComponent(pastDateYmd)}`
  );
  if (!res.ok) {
    throw new Error(`callpassresult ${pastDateYmd}: HTTP ${res.status}`);
  }
  const meta = (await res.json()) as { link?: string };
  if (!meta.link) return null;

  const blobRes = await fetch(meta.link, { headers: DEFAULT_HEADERS });
  if (!blobRes.ok) {
    throw new Error(`blob ${pastDateYmd}: HTTP ${blobRes.status}`);
  }
  return (await blobRes.json()) as Record<string, unknown>;
}

export function parseDamacaiDraw(
  raw: Record<string, unknown>,
  source = "damacai.com.my"
): DrawResultV2Row | null {
  const drawDate =
    damacaiDateToIso(String(raw.drawDate ?? "")) ??
    ymdToIso(String(raw.drawDate ?? "").replace(/\D/g, ""));
  if (!drawDate) return null;

  const first = String(raw.p1 ?? "").trim();
  if (!isValid4d(first)) return null;

  const extra_data: Record<string, unknown> = {
    damacai3Plus3D: {
      first: String(raw.p13p3d ?? ""),
      second: String(raw.p23p3d ?? ""),
      third: String(raw.p33p3d ?? ""),
      zodiac1: String(raw.zodiac3dp1 ?? ""),
      zodiac2: String(raw.zodiac3dp2 ?? ""),
      zodiac3: String(raw.zodiac3dp3 ?? ""),
      jackpot1: String(raw["1+3DJackpot1"] ?? ""),
      jackpot2: String(raw["1+3DJackpot2"] ?? ""),
      jackpot3: String(raw["3DJackpot"] ?? ""),
      special: normalizeList(raw.starterList3p3d, 10),
      consolation: normalizeList(raw.consolidateList3p3d, 10),
    },
    horses: {
      p1: raw.p1HorseNo,
      p2: raw.p2HorseNo,
      p3: raw.p3HorseNo,
    },
  };
  const jackpot3d = String(raw["3DJackpot"] ?? "").trim();
  if (jackpot3d) extra_data.damacai3DJackpot = jackpot3d;

  return {
    draw_date: drawDate,
    draw_no: String(raw.drawNo ?? "").trim() || null,
    operator: "damacai",
    first_prize: first,
    second_prize: isValid4d(String(raw.p2 ?? "")) ? String(raw.p2) : null,
    third_prize: isValid4d(String(raw.p3 ?? "")) ? String(raw.p3) : null,
    special_numbers: normalizeList(raw.starterList, 10),
    consolation_numbers: normalizeList(raw.consolidateList, 10),
    extra_data,
    source,
  };
}

export async function fetchDamacaiDrawForDate(
  pastDateYmd: string
): Promise<DrawResultV2Row | null> {
  const raw = await fetchDamacaiDrawJson(pastDateYmd);
  if (!raw) return null;
  return parseDamacaiDraw(raw);
}

export async function fetchDamacaiTodayDraw(): Promise<DrawResultV2Row | null> {
  const dates = await fetchDamacaiPastDateYmds();
  const latest = dates[dates.length - 1];
  if (!latest) return null;
  return fetchDamacaiDrawForDate(latest);
}
