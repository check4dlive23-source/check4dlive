export type VyraRegion = "west" | "east" | "singapore";

export type VyraSignalType =
  | "digit_surge"
  | "overdue"
  | "score_jump"
  | "mirror_sync";

export interface VyraSignal {
  type: VyraSignalType;
  /** Sort key: z-score / gap ratio / score delta / pair count — normalized in buildBriefData */
  surprise: number;
  /** Numbers involved (link to /number/XXXX) */
  numbers: string[];
  /** Facts for template rendering */
  data: Record<string, number | string>;
  /** Optional context ammo for narrative (omit when not computable) */
  context?: Record<string, number | string>;
}

export interface VyraBriefData {
  region: VyraRegion;
  date: string;
  signals: VyraSignal[];
  /** true when no signals after detection */
  quiet: boolean;
}

export interface VyraDrawRow {
  draw_date: string;
  operator: string;
  first_prize?: string | null;
  second_prize?: string | null;
  third_prize?: string | null;
  special_numbers?: string[] | null;
  consolation_numbers?: string[] | null;
}

export interface VyraScoreRow {
  number: string;
  scope: string;
  total_hits: number;
  current_gap_days: number | null;
  avg_gap_days: number | null;
  last_seen_date?: string | null;
  max_gap_days?: number | null;
}

export interface VyraSnapshotRow {
  snapshot_date: string;
  number: string;
  overall_score: number;
}

export interface VyraDetectInput {
  drawsRecent: VyraDrawRow[];
  drawsHistory: VyraDrawRow[];
  scores: VyraScoreRow[];
  snapshotsToday: VyraSnapshotRow[];
  snapshotsWeekAgo: VyraSnapshotRow[];
}
