import type {
  Damacai3Plus3DExtra,
  LottoBallResult,
  MagnumGoldExtra,
  MagnumLifeExtra,
  Toto5DExtra,
  Toto6DTier,
} from "@/types";
import { totoLottoLayouts } from "@/lib/mock-data";

function parseNum(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(/,/g, "").replace(/RM\s*/i, "").trim());
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function toDigit(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s || s === "----") return "";
  return s.length === 1 ? s : s.slice(-1);
}

function toInt(v: unknown): number {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function strField(v: unknown): string {
  const s = String(v ?? "").trim();
  return s && s !== "----" ? s : "";
}

const EMPTY_5D: Toto5DExtra = {
  first: "",
  second: "",
  third: "",
  fourth: "",
  fifth: "",
  sixth: "",
};

const LIFE_SLOTS = 8;
const BONUS_SLOTS = 2;

export function mapMagnumGoldExtra(raw: unknown): MagnumGoldExtra | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.jackpot1) && Array.isArray(raw.jackpot1.digits)) {
    const shaped = raw as unknown as MagnumGoldExtra;
    const hasDigits = shaped.jackpot1.digits.some((d) => d !== "" && d !== " ");
    if (hasDigits) {
      return { ...shaped, subPrizes: [] };
    }
    return null;
  }

  const digits = [
    toDigit(raw.number1),
    toDigit(raw.number2),
    toDigit(raw.number3),
    toDigit(raw.number4),
    toDigit(raw.number5),
    toDigit(raw.number6),
  ];
  const bonus = [toDigit(raw.goldenNumber1), toDigit(raw.goldenNumber2)];
  const j1 = parseNum(raw.jackpot1);
  const j2 = parseNum(raw.jackpot2);
  const hasDigits = digits.some((d) => d !== "");

  if (!hasDigits) {
    if (!j1 && !j2) return null;
    const emptyDigits = ["", "", "", "", "", ""];
    const emptyBonus = ["", ""];
    return {
      jackpot1: {
        digits: emptyDigits,
        bonus: emptyBonus,
        prize: j1 ?? 0,
      },
      jackpot2: {
        variations: [
          { digits: [...emptyDigits.slice(0, 5), ""], bonus: emptyBonus },
          { digits: ["", ...emptyDigits.slice(1, 6)], bonus: emptyBonus },
        ],
        prize: j2 ?? 0,
      },
      subPrizes: [],
    };
  }

  return {
    jackpot1: {
      digits,
      bonus,
      prize: j1 ?? 0,
    },
    jackpot2: {
      variations: [
        { digits: [...digits.slice(0, 5), ""], bonus },
        { digits: ["", ...digits.slice(1, 6)], bonus },
      ],
      prize: j2 ?? 0,
    },
    subPrizes: [],
  };
}

export function mapMagnumLifeExtra(raw: unknown): MagnumLifeExtra | null {
  if (!isRecord(raw)) return null;
  if (Array.isArray(raw.winning)) {
    const shaped = raw as unknown as MagnumLifeExtra;
    if (shaped.winning.some((n) => n > 0)) return shaped;
    return null;
  }

  const winning = [
    toInt(raw.number1),
    toInt(raw.number2),
    toInt(raw.number3),
    toInt(raw.number4),
    toInt(raw.number5),
    toInt(raw.number6),
    toInt(raw.number7),
    toInt(raw.number8),
  ];
  const bonus = [toInt(raw.bonus1), toInt(raw.bonus2)];
  if (!winning.some((n) => n > 0)) return null;

  return { winning, bonus };
}

/** Empty life grid for semi-real display (— per slot). */
export function emptyMagnumLifeGrid(): MagnumLifeExtra {
  return {
    winning: Array(LIFE_SLOTS).fill(0),
    bonus: Array(BONUS_SLOTS).fill(0),
  };
}

export function emptyDamacai3Plus3D(): Damacai3Plus3DExtra {
  return {
    prizes: [
      { position: "1st", number: "", zodiac: "", bonus: 0 },
      { position: "2nd", number: "", zodiac: "", bonus: 0 },
      { position: "3rd", number: "", zodiac: "", bonus: 0 },
    ],
    special: Array(10).fill(""),
    consolation: Array(10).fill(""),
  };
}

export function mapDamacai3Plus3DExtra(raw: unknown): Damacai3Plus3DExtra | null {
  if (!isRecord(raw)) return null;
  if (Array.isArray(raw.prizes)) {
    const shaped = raw as unknown as Damacai3Plus3DExtra;
    const hasAny = shaped.prizes.some((p) => strField(p.number));
    return hasAny ? shaped : null;
  }

  const first = strField(raw.first);
  const second = strField(raw.second);
  const third = strField(raw.third);
  if (!first && !second && !third) return null;

  const toList = (v: unknown, len: number) => {
    if (!Array.isArray(v)) return Array(len).fill("");
    return Array.from({ length: len }, (_, i) => strField(v[i]));
  };

  return {
    prizes: [
      {
        position: "1st",
        number: first,
        zodiac: strField(raw.zodiac1),
        bonus: parseNum(raw.jackpot1) ?? 0,
      },
      {
        position: "2nd",
        number: second,
        zodiac: strField(raw.zodiac2),
        bonus: parseNum(raw.jackpot2) ?? 0,
      },
      {
        position: "3rd",
        number: third,
        zodiac: strField(raw.zodiac3),
        bonus: parseNum(raw.jackpot3) ?? 0,
      },
    ],
    special: toList(raw.special, 10),
    consolation: toList(raw.consolation, 10),
  };
}

export function mapToto5DExtra(raw: unknown): Toto5DExtra {
  if (!isRecord(raw)) return { ...EMPTY_5D };
  const pick = (k: keyof Toto5DExtra) => strField(raw[k]);
  return {
    first: pick("first"),
    second: pick("second"),
    third: pick("third"),
    fourth: pick("fourth"),
    fifth: pick("fifth"),
    sixth: pick("sixth"),
  };
}

export function hasToto5DData(data: Toto5DExtra): boolean {
  return (["first", "second", "third", "fourth", "fifth", "sixth"] as const).some(
    (k) => data[k] !== ""
  );
}

export function mapToto6DTiers(raw: unknown): Toto6DTier[] | null {
  if (!isRecord(raw)) return null;
  const first = strField(raw.first);
  if (!first) return null;

  const n = first.replace(/\D/g, "");
  if (n.length < 6) return null;

  const labels = ["1st", "2nd", "3rd", "4th", "5th"] as const;
  return labels.map((label, i) => {
    if (i === 0) return { label, front: n, back: n };
    const front = n.slice(0, 6 - i) + "*".repeat(i);
    const back = "*".repeat(i) + n.slice(i);
    return { label, front, back };
  });
}

export function emptyToto6DTiers(): Toto6DTier[] {
  return ["1st", "2nd", "3rd", "4th", "5th"].map((label) => ({
    label,
    front: "",
    back: "",
  }));
}

export function mapTotoLottoGames(
  raw: unknown,
  meta: { date: string; draw_no?: string; status: LottoBallResult["status"] }
): LottoBallResult[] {
  const sections: {
    key: string;
    layout: (typeof totoLottoLayouts)[number];
    hasBonus: boolean;
    jackpot1Key?: string;
    jackpot2Key?: string;
    jackpotKey?: string;
  }[] = [
    {
      key: "star",
      layout: totoLottoLayouts[0],
      hasBonus: true,
      jackpot1Key: "jackpot1",
      jackpot2Key: "jackpot2",
    },
    {
      key: "power",
      layout: totoLottoLayouts[1],
      hasBonus: false,
      jackpotKey: "jackpot",
    },
    {
      key: "supreme",
      layout: totoLottoLayouts[2],
      hasBonus: false,
      jackpotKey: "jackpot",
    },
  ];

  return sections.map(({ key, layout, hasBonus, jackpot1Key, jackpot2Key, jackpotKey }) => {
    const section = isRecord(raw) ? raw[key] : null;
    const parsedBalls =
      isRecord(section) && Array.isArray(section.balls)
        ? section.balls
            .map((b) => parseInt(String(b), 10))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];

    const bonusRaw = isRecord(section) ? section.bonus : null;
    const bonus =
      hasBonus && bonusRaw != null && String(bonusRaw).trim() !== ""
        ? parseInt(String(bonusRaw), 10)
        : null;

    const game: LottoBallResult = {
      operator: layout.operator,
      logoKey: layout.logoKey,
      displayName: layout.displayName,
      balls: parsedBalls,
      bonus: hasBonus && Number.isFinite(bonus!) ? bonus : null,
      hasBonus,
      maxBall: layout.maxBall,
      date: meta.date,
      draw_no: meta.draw_no,
      status: meta.status,
    };

    if (isRecord(section)) {
      if (jackpot1Key) game.jackpot1_amount = parseNum(section[jackpot1Key]);
      if (jackpot2Key) game.jackpot2_amount = parseNum(section[jackpot2Key]);
      if (jackpotKey) game.jackpot_amount = parseNum(section[jackpotKey]);
    }

    return game;
  });
}

export function hasTotoLottoBalls(game: LottoBallResult): boolean {
  return game.balls.length > 0;
}
