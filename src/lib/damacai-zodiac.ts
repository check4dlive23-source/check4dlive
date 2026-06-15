import type { Lang } from "@/lib/i18n";

/** Damacai 3+3D official zodiac codes 1–12 (1=Rat … 12=Pig/Boar). */
const DAMACAI_ZODIAC: { zh: string; en: string }[] = [
  { zh: "鼠", en: "Rat" },
  { zh: "牛", en: "Ox" },
  { zh: "虎", en: "Tiger" },
  { zh: "兔", en: "Rabbit" },
  { zh: "龙", en: "Dragon" },
  { zh: "蛇", en: "Snake" },
  { zh: "马", en: "Horse" },
  { zh: "羊", en: "Goat" },
  { zh: "猴", en: "Monkey" },
  { zh: "鸡", en: "Rooster" },
  { zh: "狗", en: "Dog" },
  { zh: "猪", en: "Pig" },
];

export function formatDamacaiZodiac(code: string, lang: Lang): string {
  const s = String(code ?? "").trim();
  if (!s || s === "----") return "—";

  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return "—";

  return lang === "zh" ? DAMACAI_ZODIAC[n - 1].zh : DAMACAI_ZODIAC[n - 1].en;
}
