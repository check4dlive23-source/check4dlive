import type { TranslationKey } from "@/lib/i18n";
import type { VyraSignal, VyraSignalType } from "@/lib/vyra/types";

export type DigitSurgeVariant = "hot" | "cold";

export function digitSurgeVariant(signal: VyraSignal): DigitSurgeVariant {
  const z = Number(signal.data.z ?? 0);
  return z >= 0 ? "hot" : "cold";
}

export function digitSurgeLabelKey(signal: VyraSignal): TranslationKey {
  const head = signal.data.digitType === "head";
  const hot = digitSurgeVariant(signal) === "hot";
  if (head) return hot ? "vyraSignalHeadHot" : "vyraSignalHeadCold";
  return hot ? "vyraSignalTailHot" : "vyraSignalTailCold";
}

export function digitSurgeIcon(signal: VyraSignal): string {
  return digitSurgeVariant(signal) === "hot" ? "⚡" : "🧊";
}

const STATIC_ICONS: Record<Exclude<VyraSignalType, "digit_surge">, string> = {
  overdue: "🧊",
  score_jump: "↗",
  mirror_sync: "🔁",
};

export function vyraSignalIcon(signal: VyraSignal): string {
  if (signal.type === "digit_surge") return digitSurgeIcon(signal);
  return STATIC_ICONS[signal.type];
}

export function vyraSignalLabelKey(signal: VyraSignal): TranslationKey {
  if (signal.type === "digit_surge") return digitSurgeLabelKey(signal);
  const map: Record<Exclude<VyraSignalType, "digit_surge">, TranslationKey> = {
    overdue: "vyraSignalOverdue",
    score_jump: "vyraSignalScoreJump",
    mirror_sync: "vyraSignalMirrorSync",
  };
  return map[signal.type];
}
