import type { OperatorId, Region } from "@/types";

export interface ParsedWestDraw {
  operator: OperatorId;
  region: Region;
  date: string;
  draw_no?: string;
  first_prize?: string;
  second_prize?: string;
  third_prize?: string;
  special_numbers: string[];
  consolation_numbers: string[];
  jackpot1_amount?: number | null;
  jackpot2_amount?: number | null;
  zodiac?: string | null;
  extra_data?: Record<string, unknown>;
}

export type ParsedDraw = ParsedWestDraw;

const COMPANY_MAP: Record<string, OperatorId> = {
  MAGNUM4D: "magnum",
  DAMACAI: "damacai",
  SPORTTOTO: "toto",
  GDTOTO: "gd",
  SINGAPORE4D: "sgpools",
  SABAH88: "sabah",
  SADAKAN4D: "sandakan",
  SARAWAKCASHSWEEP: "sarawak",
  PERDANA4D: "perdana",
  PERDANA: "perdana",
  LUCKYHARI: "hari",
};

const REGION_PAGES: Partial<Record<Region, string[]>> = {
  west: ["https://www.check4dresult.com/"],
  east: ["https://www.check4dresult.com/sabah-sarawak-4d-results"],
  cambodia: [
    "https://www.check4dresult.com/grand-dragon-lotto",
    "https://www.check4dresult.com/cambodia/",
  ],
  singapore: ["https://www.check4dresult.com/singapore-4d-result"],
};

const CHECK4D_PAGES = [
  "https://www.check4dresult.com/",
  "https://www.check4dresult.com/sabah-sarawak-4d-results",
  "https://www.check4dresult.com/singapore-4d-result",
  "https://www.check4dresult.com/grand-dragon-lotto",
  "https://www.check4dresult.com/cambodia/",
] as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match exact JSON field (avoids Special1 matching inside Special10 or 3+3DSpecial1) */
function field(block: string, name: string): string | undefined {
  const m = block.match(
    new RegExp(`(?:^|[,{])${escapeRegExp(name)}:"([^"]*)"`)
  );
  return m?.[1];
}

/** Extract one full {Company:...} object from the fourDResult array slice */
function extractCompanyBlock(slice: string, company: string): string {
  const tag = `Company:"${company}"`;
  const tagIdx = slice.indexOf(tag);
  if (tagIdx === -1) return "";

  let objStart = tagIdx;
  while (objStart > 0 && slice[objStart] !== "{") objStart--;

  let depth = 0;
  let end = objStart;
  for (let i = objStart; i < slice.length; i++) {
    if (slice[i] === "{") depth++;
    else if (slice[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return slice.slice(objStart, end);
}

function parseMoney(raw?: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/RM\s*/i, "").replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function collectSpecial(block: string, prefix: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= max; i++) {
    const v = field(block, `${prefix}${i}`);
    out.push(v ?? "----");
  }
  return out;
}

function specialMax(operator: OperatorId): number {
  return operator === "damacai" ? 10 : 13;
}

function parseMagnumExtras(block: string): Record<string, unknown> | undefined {
  const goldMatch = block.match(/gold:\{([^}]+)\}/);
  const lifeMatch = block.match(/life:\{([^}]+)\}/);
  if (!goldMatch && !lifeMatch) return undefined;
  const extras: Record<string, unknown> = {};
  if (goldMatch) {
    const g = goldMatch[1];
    extras.gold = {
      number1: field(g, "number1"),
      number2: field(g, "number2"),
      number3: field(g, "number3"),
      number4: field(g, "number4"),
      number5: field(g, "number5"),
      number6: field(g, "number6"),
      goldenNumber1: field(g, "goldenNumber1"),
      goldenNumber2: field(g, "goldenNumber2"),
      jackpot1: field(g, "jackpot1"),
      jackpot2: field(g, "jackpot2"),
    };
  }
  if (lifeMatch) {
    const l = lifeMatch[1];
    extras.life = {
      number1: field(l, "number1"),
      number2: field(l, "number2"),
      number3: field(l, "number3"),
      number4: field(l, "number4"),
      number5: field(l, "number5"),
      number6: field(l, "number6"),
      number7: field(l, "number7"),
      number8: field(l, "number8"),
      bonus1: field(l, "bonus1"),
      bonus2: field(l, "bonus2"),
    };
  }
  return extras;
}

function parseDamacaiExtras(block: string): Record<string, unknown> | undefined {
  const has33 =
    block.includes('"3+3DFirstPrize"') || block.includes("3+3DFirstPrize");
  if (!has33) return undefined;
  return {
    damacai3Plus3D: {
      first: field(block, "3+3DFirstPrize"),
      second: field(block, "3+3DSecondPrize"),
      third: field(block, "3+3DThirdPrize"),
      zodiac1: field(block, "3+3DZodiac1"),
      zodiac2: field(block, "3+3DZodiac2"),
      zodiac3: field(block, "3+3DZodiac3"),
      jackpot1: field(block, "3+3DJackpot1"),
      jackpot2: field(block, "3+3DJackpot2"),
      jackpot3: field(block, "3+3DJackpot3"),
      special: collectSpecial(block, "3+3DSpecial", 10),
      consolation: collectSpecial(block, "3+3DConsole", 10),
    },
  };
}

function parseTotoExtras(block: string): Record<string, unknown> | undefined {
  return {
    toto5D: {
      first: field(block, "5D1st"),
      second: field(block, "5D2nd"),
      third: field(block, "5D3rd"),
      fourth: field(block, "5D4th"),
      fifth: field(block, "5D5th"),
      sixth: field(block, "5D6th"),
    },
    toto6D: { first: field(block, "6d1st") },
    totoLotto: {
      star: {
        balls: [
          field(block, "StarTotoNo1"),
          field(block, "StarTotoNo2"),
          field(block, "StarTotoNo3"),
          field(block, "StarTotoNo4"),
          field(block, "StarTotoNo5"),
          field(block, "StarTotoNo6"),
        ].filter(Boolean),
        bonus: field(block, "StarTotoNo7"),
        jackpot1: field(block, "StarTotoJackPot1"),
        jackpot2: field(block, "StarTotoJackPot2"),
      },
      power: {
        balls: [
          field(block, "PowerTotoNo1"),
          field(block, "PowerTotoNo2"),
          field(block, "PowerTotoNo3"),
          field(block, "PowerTotoNo4"),
          field(block, "PowerTotoNo5"),
          field(block, "PowerTotoNo6"),
        ].filter(Boolean),
        jackpot: field(block, "PowerTotoJackPot"),
      },
      supreme: {
        balls: [
          field(block, "SupremeTotoNo1"),
          field(block, "SupremeTotoNo2"),
          field(block, "SupremeTotoNo3"),
          field(block, "SupremeTotoNo4"),
          field(block, "SupremeTotoNo5"),
          field(block, "SupremeTotoNo6"),
        ].filter(Boolean),
        jackpot: field(block, "SupremeTotoJackPot"),
      },
    },
  };
}

function regionForOperator(op: OperatorId): Region {
  if (op === "gd" || op === "perdana" || op === "hari") return "cambodia";
  if (op === "sabah" || op === "sarawak" || op === "sandakan") return "east";
  if (op === "sgpools") return "singapore";
  return "west";
}

function parseCompanyBlock(
  block: string,
  company: string
): ParsedDraw | null {
  const operator = COMPANY_MAP[company];
  if (!operator) return null;

  const date =
    field(block, "DrawDateIsoFormat") ??
    field(block, "DrawDate")?.split("/").reverse().join("-");
  if (!date) return null;

  let extra: Record<string, unknown> | undefined;
  if (company === "MAGNUM4D") extra = parseMagnumExtras(block);
  if (company === "DAMACAI") extra = parseDamacaiExtras(block);
  if (company === "SPORTTOTO") extra = parseTotoExtras(block);

  const spMax = specialMax(operator);

  return {
    operator,
    region: regionForOperator(operator),
    date,
    draw_no: field(block, "DrawId"),
    first_prize: field(block, "FirstPrize"),
    second_prize: field(block, "SecondPrize"),
    third_prize: field(block, "ThirdPrize"),
    special_numbers: collectSpecial(block, "Special", spMax),
    consolation_numbers: collectSpecial(block, "Console", 10),
    jackpot1_amount: parseMoney(
      field(block, "Jackpot1Amount") ?? field(block, "JackPot1Amount")
    ),
    jackpot2_amount: parseMoney(
      field(block, "Jackpot2Amount") ?? field(block, "JackPot2Amount")
    ),
    zodiac: operator === "toto" ? field(block, "Zodiac") ?? null : null,
    extra_data: extra,
  };
}

/** Parse embedded fourDResult payload from check4dresult.com HTML */
export function parseCheck4dHtml(html: string): ParsedDraw[] {
  const marker = "fourDResult:[";
  const start = html.indexOf(marker);
  if (start === -1) return [];

  const slice = html.slice(start + marker.length);
  const results: ParsedDraw[] = [];
  const seen = new Set<string>();

  for (const company of Object.keys(COMPANY_MAP)) {
    const block = extractCompanyBlock(slice, company);
    if (!block) continue;
    const parsed = parseCompanyBlock(block, company);
    if (!parsed) continue;
    const key = `${parsed.operator}:${parsed.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(parsed);
  }

  return results;
}

export async function fetchCheck4dHtml(
  url = "https://www.check4dresult.com/"
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Check4DLive/1.0)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`check4dresult fetch failed (${url}): ${res.status}`);
  }
  return res.text();
}

/** Scrape west, east, and cambodia operators from all known check4dresult pages */
export async function fetchAllCheck4dDraws(
  region?: Region
): Promise<ParsedDraw[]> {
  const pages = region ? (REGION_PAGES[region] ?? CHECK4D_PAGES) : CHECK4D_PAGES;
  const byKey = new Map<string, ParsedDraw>();

  for (const url of pages) {
    try {
      const html = await fetchCheck4dHtml(url);
      for (const draw of parseCheck4dHtml(html)) {
        byKey.set(`${draw.operator}:${draw.date}`, draw);
      }
    } catch (err) {
      console.warn(
        `[parse-check4d] failed to fetch ${url}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const draws = Array.from(byKey.values());
  console.log(
    `[parse-check4d] fetched ${draws.length} draws from ${pages.length} pages`
  );
  return draws;
}
