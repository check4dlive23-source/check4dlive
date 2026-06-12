export type Region = "west" | "east" | "singapore";

export type OperatorId =
  | "magnum"
  | "damacai"
  | "toto"
  | "sabah"
  | "sarawak"
  | "sandakan"
  | "gd"
  | "perdana"
  | "hari"
  | "sgpools";

/** Operator or game-specific logo asset key (see /public/logos/) */
export type LogoKey =
  | OperatorId
  | "toto_5d"
  | "toto_6d"
  | "toto_lotto"
  | "magnum_jg"
  | "magnum_life";

export type DrawStatus = "live" | "drawn" | "pending" | "daily";

export type PrizePosition =
  | "first"
  | "second"
  | "third"
  | "special"
  | "consolation";

export interface Draw {
  id?: string;
  date: string;
  draw_no?: string;
  operator: OperatorId;
  region: Region;
  first_prize?: string | null;
  second_prize?: string | null;
  third_prize?: string | null;
  special_numbers?: string[] | null;
  consolation_numbers?: string[] | null;
  jackpot1_amount?: number | null;
  jackpot2_amount?: number | null;
  zodiac?: string | null;
  extra_data?: Record<string, unknown> | null;
}

export interface DrawResult extends Draw {
  status: DrawStatus;
  subtitle?: string;
  displayName: string;
}

export interface Jackpot4DResult {
  operator: OperatorId;
  displayName: string;
  date: string;
  draw_no?: string;
  jackpot1_amount: number;
  jackpot2_amount: number;
  status: DrawStatus;
}

export interface Toto5DExtra {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  sixth: string;
}

export interface Toto6DTier {
  label: string;
  front: string;
  back: string;
}

export interface LottoBallResult {
  operator: OperatorId;
  logoKey?: LogoKey;
  displayName: string;
  subtitle?: string;
  balls: number[];
  bonus?: number | null;
  hasBonus: boolean;
  maxBall: number;
  jackpot1_amount?: number;
  jackpot2_amount?: number;
  jackpot_amount?: number;
  /** Display prefix for jackpot lines (default RM). */
  currency?: string;
  date: string;
  draw_no?: string;
  status: DrawStatus;
}

export interface MagnumGoldJackpot1 {
  digits: string[];
  bonus: string[];
  prize: number;
}

export interface MagnumGoldJackpot2 {
  variations: { digits: string[]; bonus: string[] }[];
  prize: number;
}

export interface MagnumGoldSubPrize {
  label: string;
  amount: number;
}

export interface MagnumGoldExtra {
  jackpot1: MagnumGoldJackpot1;
  jackpot2: MagnumGoldJackpot2;
  subPrizes: MagnumGoldSubPrize[];
}

export interface MagnumLifeExtra {
  winning: number[];
  bonus: number[];
}

export interface Damacai3Plus3DPrize {
  position: string;
  number: string;
  zodiac: string;
  bonus: number;
}

export interface Damacai3Plus3DExtra {
  prizes: Damacai3Plus3DPrize[];
  special: string[];
  consolation: string[];
}

export interface Sabah3DExtra {
  first: string;
  second: string;
  third: string;
}

export interface SabahLottoTier {
  numbers: string[];
  bonus: string;
  prize: string;
}

export interface SabahLottoExtra {
  lotto5: SabahLottoTier[];
  lotto6: SabahLottoTier[];
}

export interface RegionResults {
  operators: Record<string, DrawResult | Jackpot4DResult | LottoBallResult>;
}

export interface OperatorsMap {
  [key: string]: DrawResult;
}
