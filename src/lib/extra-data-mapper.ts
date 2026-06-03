import type {
  Damacai3Plus3DExtra,
  LottoBallResult,
  MagnumGoldExtra,
  MagnumLifeExtra,
  Toto5DExtra,
  Toto6DTier,
} from "@/types";

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toDigit(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s || s === "----") return "";
  return s.length === 1 ? s : s.slice(-1);
}

function toInt(v: unknown): number {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function mapMagnumGoldExtra(
  raw: unknown,
  fallback: MagnumGoldExtra
): MagnumGoldExtra {
  if (!isRecord(raw)) return fallback;
  if (isRecord(raw.jackpot1) && Array.isArray(raw.jackpot1.digits)) {
    return raw as unknown as MagnumGoldExtra;
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
  const hasNumbers = digits.some((d) => d !== "");

  if (!hasNumbers) return fallback;

  return {
    jackpot1: {
      digits,
      bonus,
      prize: parseNum(raw.jackpot1),
    },
    jackpot2: {
      variations: [
        { digits: [...digits.slice(0, 5), ""], bonus },
        { digits: ["", ...digits.slice(1, 6)], bonus },
      ],
      prize: parseNum(raw.jackpot2),
    },
    subPrizes: fallback.subPrizes,
  };
}

export function mapMagnumLifeExtra(
  raw: unknown,
  fallback: MagnumLifeExtra
): MagnumLifeExtra {
  if (!isRecord(raw)) return fallback;
  if (Array.isArray(raw.winning)) {
    return raw as unknown as MagnumLifeExtra;
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
  const hasNumbers = winning.some((n) => n > 0);

  if (!hasNumbers) return fallback;

  return { winning, bonus };
}

export function mapDamacai3Plus3DExtra(
  raw: unknown,
  fallback: Damacai3Plus3DExtra
): Damacai3Plus3DExtra {
  if (!isRecord(raw)) return fallback;
  if (Array.isArray(raw.prizes)) {
    return raw as unknown as Damacai3Plus3DExtra;
  }

  const first = String(raw.first ?? "").trim();
  const second = String(raw.second ?? "").trim();
  const third = String(raw.third ?? "").trim();
  if (!first && !second && !third) return fallback;

  const toList = (v: unknown, fb: string[]) =>
    Array.isArray(v) ? v.map(String) : fb;

  return {
    prizes: [
      {
        position: "1st",
        number: first,
        zodiac: String(raw.zodiac1 ?? ""),
        bonus: parseNum(raw.jackpot1),
      },
      {
        position: "2nd",
        number: second,
        zodiac: String(raw.zodiac2 ?? ""),
        bonus: parseNum(raw.jackpot2),
      },
      {
        position: "3rd",
        number: third,
        zodiac: String(raw.zodiac3 ?? ""),
        bonus: parseNum(raw.jackpot3),
      },
    ],
    special: toList(raw.special, fallback.special),
    consolation: toList(raw.consolation, fallback.consolation),
  };
}

export function mapToto5DExtra(
  raw: unknown,
  fallback: Toto5DExtra
): Toto5DExtra {
  if (!isRecord(raw)) return fallback;
  const str = (k: keyof Toto5DExtra) => String(raw[k] ?? fallback[k] ?? "");
  const hasAny = (["first", "second", "third"] as const).some(
    (k) => String(raw[k] ?? "").trim() !== ""
  );
  if (!hasAny) return fallback;
  return {
    first: str("first"),
    second: str("second"),
    third: str("third"),
    fourth: str("fourth"),
    fifth: str("fifth"),
    sixth: str("sixth"),
  };
}

export function mapToto6DTiers(
  raw: unknown,
  fallback: Toto6DTier[]
): Toto6DTier[] {
  if (!isRecord(raw)) return fallback;
  const first = String(raw.first ?? "").trim();
  if (!first || first === "----") return fallback;

  const n = first.replace(/\D/g, "");
  if (n.length < 6) return fallback;

  const labels = ["1st", "2nd", "3rd", "4th", "5th"] as const;
  return labels.map((label, i) => {
    if (i === 0) return { label, front: n, back: n };
    const front = n.slice(0, 6 - i) + "*".repeat(i);
    const back = "*".repeat(i) + n.slice(i);
    return { label, front, back };
  });
}

export function mapTotoLottoGames(
  raw: unknown,
  fallback: LottoBallResult[],
  meta: { date: string; draw_no?: string; status: LottoBallResult["status"] }
): LottoBallResult[] {
  if (!isRecord(raw)) return fallback;

  const sections: {
    key: string;
    idx: number;
    hasBonus: boolean;
    jackpot1Key?: string;
    jackpot2Key?: string;
    jackpotKey?: string;
  }[] = [
    {
      key: "star",
      idx: 0,
      hasBonus: true,
      jackpot1Key: "jackpot1",
      jackpot2Key: "jackpot2",
    },
    { key: "power", idx: 1, hasBonus: false, jackpotKey: "jackpot" },
    { key: "supreme", idx: 2, hasBonus: false, jackpotKey: "jackpot" },
  ];

  return sections.map(({ key, idx, hasBonus, jackpot1Key, jackpot2Key, jackpotKey }) => {
    const base = fallback[idx] ?? fallback[0];
    const section = raw[key];
    if (!isRecord(section)) return { ...base, ...meta };

    const balls = Array.isArray(section.balls)
      ? section.balls
          .map((b) => parseInt(String(b), 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      : base.balls;

    if (balls.length === 0) return { ...base, ...meta };

    const bonusRaw = section.bonus;
    const bonus =
      hasBonus && bonusRaw != null && String(bonusRaw).trim() !== ""
        ? parseInt(String(bonusRaw), 10)
        : null;

    const game: LottoBallResult = {
      ...base,
      ...meta,
      balls,
      bonus: hasBonus ? (Number.isFinite(bonus!) ? bonus : base.bonus) : null,
      hasBonus,
    };

    if (jackpot1Key && section[jackpot1Key] != null) {
      game.jackpot1_amount = parseNum(section[jackpot1Key]);
    }
    if (jackpot2Key && section[jackpot2Key] != null) {
      game.jackpot2_amount = parseNum(section[jackpot2Key]);
    }
    if (jackpotKey && section[jackpotKey] != null) {
      game.jackpot_amount = parseNum(section[jackpotKey]);
    }

    return game;
  });
}
