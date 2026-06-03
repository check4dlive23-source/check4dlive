import type {
  Damacai3Plus3DExtra,
  DrawResult,
  DrawStatus,
  Jackpot4DResult,
  LottoBallResult,
  MagnumGoldExtra,
  MagnumLifeExtra,
  Region,
  Sabah3DExtra,
  Toto5DExtra,
  Toto6DTier,
} from "@/types";

/** Raw draw payloads (matches 4dmoon / live source shape) */
export const mockDraws = {
  magnum: {
    operator: "magnum" as const,
    drawNo: "375/26",
    date: "2026-05-31",
    status: "completed" as const,
    first_prize: "5984",
    second_prize: "0396",
    third_prize: "2505",
    special_numbers: [
      "2631",
      "1959",
      "5539",
      "3767",
      "5772",
      "9256",
      "----",
      "----",
      "----",
      "0452",
      "9082",
      "2113",
      "4207",
    ],
    consolation_numbers: [
      "1992",
      "9024",
      "2386",
      "0896",
      "8411",
      "3716",
      "5117",
      "8195",
      "7033",
      "4035",
    ],
    jackpot1_amount: 20376000,
    jackpot2_amount: 236000,
  },
  damacai: {
    operator: "damacai" as const,
    drawNo: "6085/26",
    date: "2026-05-31",
    status: "completed" as const,
    first_prize: "6982",
    second_prize: "8724",
    third_prize: "6540",
    special_numbers: [
      "9088",
      "5042",
      "8300",
      "3753",
      "3332",
      "8589",
      "7727",
      "8253",
      "3787",
      "9745",
    ],
    consolation_numbers: [
      "7840",
      "8562",
      "9507",
      "0639",
      "4921",
      "1007",
      "6522",
      "6505",
      "8603",
      "5753",
    ],
    jackpot1_amount: 9310768,
    jackpot2_amount: 130835,
  },
  toto: {
    operator: "toto" as const,
    drawNo: "6138/26",
    date: "2026-05-31",
    status: "completed" as const,
    first_prize: "1660",
    second_prize: "6839",
    third_prize: "5093",
    zodiac: "DRAGON",
    special_numbers: [
      "8408",
      "----",
      "3164",
      "9523",
      "8884",
      "9477",
      "2935",
      "----",
      "4358",
      "----",
      "9024",
      "0883",
      "3669",
    ],
    consolation_numbers: [
      "5119",
      "3345",
      "6704",
      "7667",
      "6803",
      "5013",
      "6621",
      "0252",
      "6597",
      "2200",
    ],
    jackpot1_amount: 3_294_949.54,
    jackpot2_amount: 174_867.89,
  },
};

const DISPLAY_NAMES: Record<"magnum" | "damacai" | "toto", string> = {
  magnum: "Magnum 4D",
  damacai: "Damacai 1+3D",
  toto: "Sports Toto 4D",
};

function mapStatus(raw: "completed" | string): DrawStatus {
  if (raw === "completed") return "drawn";
  return "drawn";
}

function toWestDrawResult(
  key: keyof typeof mockDraws
): DrawResult {
  const d = mockDraws[key];
  return {
    operator: d.operator,
    region: "west",
    displayName: DISPLAY_NAMES[key],
    subtitle: "Wed/Sat/Sun 7:00PM",
    date: d.date,
    draw_no: d.drawNo,
    status: mapStatus(d.status),
    first_prize: d.first_prize,
    second_prize: d.second_prize,
    third_prize: d.third_prize,
    special_numbers: d.special_numbers,
    consolation_numbers: d.consolation_numbers,
    jackpot1_amount: d.jackpot1_amount ?? undefined,
    jackpot2_amount: d.jackpot2_amount ?? undefined,
    zodiac: key === "toto" && "zodiac" in d ? d.zodiac : undefined,
  };
}

export const westMain4D: DrawResult[] = [
  toWestDrawResult("magnum"),
  toWestDrawResult("damacai"),
  toWestDrawResult("toto"),
];

export const westJackpots: Jackpot4DResult[] = [
  {
    operator: "magnum",
    displayName: "Magnum 4D Jackpot",
    date: mockDraws.magnum.date,
    draw_no: mockDraws.magnum.drawNo,
    status: "drawn",
    jackpot1_amount: mockDraws.magnum.jackpot1_amount,
    jackpot2_amount: mockDraws.magnum.jackpot2_amount,
  },
  {
    operator: "damacai",
    displayName: "Damacai 4D Jackpot",
    date: mockDraws.damacai.date,
    draw_no: mockDraws.damacai.drawNo,
    status: "drawn",
    jackpot1_amount: mockDraws.damacai.jackpot1_amount,
    jackpot2_amount: mockDraws.damacai.jackpot2_amount,
  },
];

const MOCK_DATE = "2026-05-31";

const special13 = [
  "9088",
  "5042",
  "8300",
  "3753",
  "3332",
  "8589",
  "7727",
  "8253",
  "3787",
  "9745",
  "----",
  "----",
  "----",
];

const consolation10 = [
  "7840",
  "8562",
  "9507",
  "0639",
  "4921",
  "1007",
  "6522",
  "6505",
  "8603",
  "5753",
];

export const magnumGold: MagnumGoldExtra = {
  jackpot1: {
    digits: ["8", "4", "9", "6", "0", "5"],
    bonus: ["1", "9"],
    prize: 10907488.79,
  },
  jackpot2: {
    variations: [
      { digits: ["8", "4", "9", "6", "0", ""], bonus: ["1", "9"] },
      { digits: ["", "4", "9", "6", "0", "5"], bonus: ["1", "9"] },
    ],
    prize: 146159.99,
  },
  subPrizes: [
    { label: "3rd Prize", amount: 8888 },
    { label: "4th Prize", amount: 4888 },
    { label: "5th Prize", amount: 988 },
    { label: "6th Prize", amount: 488 },
    { label: "7th Prize", amount: 10 },
  ],
};

export const magnumLife: MagnumLifeExtra = {
  winning: [3, 7, 12, 18, 22, 28, 31, 35],
  bonus: [9, 24],
};

export const damacai3Plus3D: Damacai3Plus3DExtra = {
  prizes: [
    { position: "1st", number: "066982", zodiac: "SNAKE", bonus: 188333.3 },
    { position: "2nd", number: "488724", zodiac: "BOAR", bonus: 1335833.3 },
    { position: "3rd", number: "386540", zodiac: "TIGER", bonus: 1503339.0 },
  ],
  special: [
    "419088",
    "405042",
    "298300",
    "783753",
    "723332",
    "938589",
    "707727",
    "198253",
    "393787",
    "459745",
  ],
  consolation: [
    "447840",
    "048562",
    "219507",
    "730639",
    "434921",
    "061007",
    "156522",
    "346505",
    "268603",
    "475753",
  ],
};

export const toto5D: Toto5DExtra = {
  first: "38472",
  second: "10583",
  third: "67201",
  fourth: "4521",
  fifth: "8834",
  sixth: "729",
};

export const toto6DTiers: Toto6DTier[] = [
  { label: "1st", front: "823294", back: "823294" },
  { label: "2nd", front: "82329*", back: "*23294" },
  { label: "3rd", front: "8232**", back: "**3294" },
  { label: "4th", front: "823***", back: "***294" },
  { label: "5th", front: "82****", back: "****94" },
];

export const totoLottoGames: LottoBallResult[] = [
  {
    operator: "toto",
    logoKey: "toto_lotto",
    displayName: "Star Toto 6/50",
    balls: [28, 18, 9, 16, 45, 47],
    bonus: 33,
    hasBonus: true,
    maxBall: 50,
    jackpot1_amount: 3294949.54,
    jackpot2_amount: 174867.89,
    date: MOCK_DATE,
    draw_no: mockDraws.toto.drawNo,
    status: "drawn",
  },
  {
    operator: "toto",
    logoKey: "toto_lotto",
    displayName: "Power Toto 6/55",
    balls: [18, 29, 3, 13, 35, 15],
    bonus: null,
    hasBonus: false,
    maxBall: 55,
    jackpot_amount: 9189345.74,
    date: MOCK_DATE,
    draw_no: mockDraws.toto.drawNo,
    status: "drawn",
  },
  {
    operator: "toto",
    logoKey: "toto_lotto",
    displayName: "Supreme Toto 6/58",
    balls: [6, 25, 36, 38, 49, 50],
    bonus: null,
    hasBonus: false,
    maxBall: 58,
    jackpot_amount: 9584278.42,
    date: MOCK_DATE,
    draw_no: mockDraws.toto.drawNo,
    status: "drawn",
  },
];

export const eastMain4D: DrawResult[] = [
  {
    operator: "sabah",
    region: "east",
    displayName: "Sabah Lotto88 4D",
    subtitle: "Wed/Sat/Sun 6:30PM",
    date: MOCK_DATE,
    draw_no: "088/26",
    status: "drawn",
    first_prize: "3341",
    second_prize: "7782",
    third_prize: "0195",
    special_numbers: special13,
    consolation_numbers: consolation10,
  },
  {
    operator: "sarawak",
    region: "east",
    displayName: "Cash Sweep 4D",
    subtitle: "Wed/Sat/Sun 6:30PM",
    date: MOCK_DATE,
    draw_no: "CS375",
    status: "drawn",
    first_prize: "5520",
    second_prize: "1934",
    third_prize: "8671",
    special_numbers: special13,
    consolation_numbers: consolation10,
  },
  {
    operator: "sandakan",
    region: "east",
    displayName: "Sandakan STC 4D",
    subtitle: "Wed/Sat/Sun 6:30PM",
    date: MOCK_DATE,
    draw_no: "STC31",
    status: "drawn",
    first_prize: "4418",
    second_prize: "2903",
    third_prize: "6752",
    special_numbers: special13,
    consolation_numbers: consolation10,
  },
];

export const sabah3D: Sabah3DExtra = {
  first: "418",
  second: "903",
  third: "752",
};

export const sabahLottoGames: LottoBallResult[] = [
  {
    operator: "sabah",
    displayName: "Sabah Lotto88 6/45",
    balls: [5, 14, 22, 30, 38, 43],
    bonus: 12,
    hasBonus: true,
    maxBall: 45,
    jackpot1_amount: 8200000,
    jackpot2_amount: 320000,
    date: MOCK_DATE,
    draw_no: "088/26",
    status: "drawn",
  },
  {
    operator: "sabah",
    displayName: "Sabah Lotto 5",
    balls: [3, 11, 19, 27, 34],
    bonus: 8,
    hasBonus: true,
    maxBall: 36,
    jackpot1_amount: 2100000,
    jackpot2_amount: 95000,
    date: MOCK_DATE,
    draw_no: "088/26",
    status: "drawn",
  },
  {
    operator: "sabah",
    displayName: "Sabah Lotto 6",
    balls: [2, 9, 16, 23, 30, 36],
    bonus: 14,
    hasBonus: true,
    maxBall: 36,
    jackpot_amount: 4500000,
    date: MOCK_DATE,
    draw_no: "088/26",
    status: "drawn",
  },
];

export const cambodiaMain4D: DrawResult[] = [
  {
    operator: "gd",
    region: "cambodia",
    displayName: "Grand Dragon Lotto 4D",
    subtitle: "Daily",
    date: MOCK_DATE,
    draw_no: "GD-1532",
    status: "daily",
    first_prize: "8821",
    second_prize: "3047",
    third_prize: "5196",
    special_numbers: special13,
    consolation_numbers: consolation10,
  },
  {
    operator: "perdana",
    region: "cambodia",
    displayName: "Perdana 4D",
    subtitle: "Daily",
    date: MOCK_DATE,
    draw_no: "P-882",
    status: "daily",
    first_prize: "1274",
    second_prize: "6503",
    third_prize: "9381",
    special_numbers: special13,
    consolation_numbers: consolation10,
  },
  {
    operator: "hari",
    region: "cambodia",
    displayName: "Lucky Hari Hari 4D",
    subtitle: "Daily",
    date: MOCK_DATE,
    draw_no: "HH-441",
    status: "daily",
    first_prize: "7032",
    second_prize: "1845",
    third_prize: "4268",
    special_numbers: special13,
    consolation_numbers: consolation10,
  },
];

export const singapore4D: DrawResult = {
  operator: "sgpools",
  region: "singapore",
  displayName: "Singapore Pools 4D",
  subtitle: "Wed/Sat/Sun 6:30PM SGT",
  date: MOCK_DATE,
  draw_no: "SG-1847",
  status: "drawn",
  first_prize: "2916",
  second_prize: "8403",
  third_prize: "1578",
  special_numbers: [],
  consolation_numbers: consolation10,
};

export const singaporeToto: LottoBallResult = {
  operator: "sgpools",
  displayName: "Singapore Pools Toto 6/45",
  subtitle: "Mon/Thu 9:30PM SGT",
  balls: [10, 13, 30, 35, 38, 44],
  bonus: 15,
  hasBonus: true,
  maxBall: 45,
  jackpot1_amount: 12000000,
  jackpot2_amount: 480000,
  date: "2026-05-29",
  draw_no: "T-4021",
  status: "drawn",
};

export const regionLabels: Record<
  Region,
  { flag: string; label: string; schedule: string }
> = {
  west: { flag: "🇲🇾", label: "西马", schedule: "主要 4D — 三/六/日 晚7PM" },
  east: { flag: "🏝", label: "东马", schedule: "东马 4D — 三/六/日 晚6:30PM" },
  cambodia: { flag: "🇰🇭", label: "柬埔寨", schedule: "每日开奖" },
  singapore: { flag: "🇸🇬", label: "新加坡", schedule: "新加坡彩票" },
};
