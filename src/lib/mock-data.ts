import { specialSlotCount } from "@/lib/prize-slots";
import type {
  DrawResult,
  LottoBallResult,
  Region,
} from "@/types";

/** Layout-only skeletons — no prize numbers or jackpot amounts. */

function skeleton4D(
  operator: DrawResult["operator"],
  region: Region,
  displayName: string,
  subtitle: string
): DrawResult {
  const spCount = specialSlotCount(operator);
  return {
    operator,
    region,
    displayName,
    subtitle,
    date: "",
    status: "pending",
    special_numbers: Array(spCount).fill("----"),
    consolation_numbers: Array(10).fill("----"),
  };
}

export const westMain4D: DrawResult[] = [
  skeleton4D("magnum", "west", "Magnum 4D", "Wed/Sat/Sun 7:00PM"),
  skeleton4D("damacai", "west", "Damacai 1+3D", "Wed/Sat/Sun 7:00PM"),
  skeleton4D("toto", "west", "Sports Toto 4D", "Wed/Sat/Sun 7:00PM"),
];

export const eastMain4D: DrawResult[] = [
  skeleton4D("sabah", "east", "Sabah Lotto88 4D", "Wed/Sat/Sun 6:30PM"),
  skeleton4D("sarawak", "east", "Cash Sweep 4D", "Wed/Sat/Sun 6:30PM"),
  skeleton4D("sandakan", "east", "Sandakan STC 4D", "Wed/Sat/Sun 6:30PM"),
];

export const singapore4D: DrawResult = {
  ...skeleton4D(
    "sgpools",
    "singapore",
    "Singapore Pools 4D",
    "Wed/Sat/Sun 6:30PM SGT"
  ),
  special_numbers: [],
};

/** SG Toto — layout metadata only (no balls/jackpot). */
export const singaporeTotoLayout: Pick<
  LottoBallResult,
  "operator" | "displayName" | "subtitle" | "hasBonus" | "maxBall"
> = {
  operator: "sgpools",
  displayName: "Singapore Pools Toto 6/45",
  subtitle: "Mon/Thu 9:30PM SGT",
  hasBonus: true,
  maxBall: 45,
};

export const sabahLottoLayouts: Pick<
  LottoBallResult,
  "operator" | "displayName" | "hasBonus" | "maxBall"
>[] = [
  {
    operator: "sabah",
    displayName: "Sabah Lotto88 6/45",
    hasBonus: true,
    maxBall: 45,
  },
  {
    operator: "sabah",
    displayName: "Sabah Lotto 5",
    hasBonus: true,
    maxBall: 36,
  },
  {
    operator: "sabah",
    displayName: "Sabah Lotto 6",
    hasBonus: true,
    maxBall: 36,
  },
];

export const totoLottoLayouts: Pick<
  LottoBallResult,
  "operator" | "logoKey" | "displayName" | "hasBonus" | "maxBall"
>[] = [
  {
    operator: "toto",
    logoKey: "toto_lotto",
    displayName: "Star Toto 6/50",
    hasBonus: true,
    maxBall: 50,
  },
  {
    operator: "toto",
    logoKey: "toto_lotto",
    displayName: "Power Toto 6/55",
    hasBonus: false,
    maxBall: 55,
  },
  {
    operator: "toto",
    logoKey: "toto_lotto",
    displayName: "Supreme Toto 6/58",
    hasBonus: false,
    maxBall: 58,
  },
];

export const regionLabels: Record<
  Region,
  { flag: string; label: string; schedule: string }
> = {
  west: { flag: "🇲🇾", label: "西马", schedule: "主要 4D — 三/六/日 晚7PM" },
  east: { flag: "🏝", label: "东马", schedule: "东马 4D — 三/六/日 晚6:30PM" },
  singapore: { flag: "🇸🇬", label: "新加坡", schedule: "新加坡彩票" },
};
