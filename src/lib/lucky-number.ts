export type LuckyGameType = "4d" | "jp4d" | "5d" | "6d" | "lotto" | "life";

export interface LuckyGame {
  id: string;
  label: string;
  sublabel?: string;
  note?: string;
  type: LuckyGameType;
  max?: number;
  count?: number;
  /** Machine-drawn bonus ball (player never picks this) */
  hasBonus?: boolean;
}

export type LuckyResult =
  | { type: "4d"; value: string }
  | { type: "jp4d"; a: string; b: string }
  | { type: "5d"; value: string }
  | { type: "6d"; value: string }
  | { type: "lotto"; balls: number[]; bonus?: number }
  | { type: "life"; winning: number[]; bonus: number[] };

export const LUCKY_GAMES: LuckyGame[] = [
  { id: "4d", label: "4D 号码", sublabel: "适用所有彩票", type: "4d" },
  {
    id: "jp4d",
    label: "4D Jackpot",
    note: "两个号码同时出现在头/二/三奖才中",
    type: "jp4d",
  },
  { id: "5d", label: "Sports Toto 5D", type: "5d" },
  { id: "6d", label: "Sports Toto 6D", type: "6d" },
  {
    id: "star50",
    label: "Star Toto 6/50",
    sublabel: "选6个号码 (1-50)，系统另抽1个Bonus球",
    type: "lotto",
    max: 50,
    count: 6,
    hasBonus: true,
  },
  {
    id: "power55",
    label: "Power Toto 6/55",
    sublabel: "选6个号码 (1-55)",
    type: "lotto",
    max: 55,
    count: 6,
    hasBonus: false,
  },
  {
    id: "supreme58",
    label: "Supreme Toto 6/58",
    sublabel: "选6个号码 (1-58)",
    type: "lotto",
    max: 58,
    count: 6,
    hasBonus: false,
  },
  {
    id: "life",
    label: "Magnum Life",
    sublabel: "选8个号码 (1-36)，系统另抽2个Bonus球",
    type: "life",
  },
  {
    id: "sabah5",
    label: "Sabah Lotto 5",
    sublabel: "选5个号码 (1-36)，系统另抽1个Bonus球",
    type: "lotto",
    max: 36,
    count: 5,
    hasBonus: true,
  },
  {
    id: "sabah6",
    label: "Sabah Lotto 6",
    sublabel: "选6个号码 (1-36)，系统另抽1个Bonus球",
    type: "lotto",
    max: 36,
    count: 6,
    hasBonus: true,
  },
  {
    id: "sabah645",
    label: "Sabah 6/45",
    sublabel: "选6个号码 (1-45)，系统另抽1个Bonus球",
    type: "lotto",
    max: 45,
    count: 6,
    hasBonus: true,
  },
  {
    id: "sgtoto",
    label: "Singapore Toto",
    sublabel: "选6个号码 (1-45)，系统另抽1个Bonus球",
    type: "lotto",
    max: 45,
    count: 6,
    hasBonus: true,
  },
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

function pad(n: number, digits: number): string {
  return String(n).padStart(digits, "0");
}

function uniqueBalls(count: number, max: number): number[] {
  const set = new Set<number>();
  while (set.size < count) {
    set.add(randomInt(max - 1) + 1);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function pickBonus(max: number, exclude: number[]): number {
  let bonus: number;
  do {
    bonus = randomInt(max - 1) + 1;
  } while (exclude.includes(bonus));
  return bonus;
}

export function generateLucky(game: LuckyGame): LuckyResult {
  switch (game.type) {
    case "4d":
      return { type: "4d", value: pad(randomInt(9999), 4) };
    case "jp4d":
      return {
        type: "jp4d",
        a: pad(randomInt(9999), 4),
        b: pad(randomInt(9999), 4),
      };
    case "5d":
      return { type: "5d", value: pad(randomInt(99999), 5) };
    case "6d":
      return { type: "6d", value: pad(randomInt(999999), 6) };
    case "lotto": {
      const max = game.max ?? 50;
      const count = game.count ?? 6;
      const balls = uniqueBalls(count, max);
      if (game.hasBonus) {
        return { type: "lotto", balls, bonus: pickBonus(max, balls) };
      }
      return { type: "lotto", balls };
    }
    case "life": {
      const winning = uniqueBalls(8, 36);
      const bonus: number[] = [];
      while (bonus.length < 2) {
        const b = randomInt(35) + 1;
        if (!winning.includes(b) && !bonus.includes(b)) bonus.push(b);
      }
      bonus.sort((a, b) => a - b);
      return { type: "life", winning, bonus };
    }
  }
}
