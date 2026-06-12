import Anthropic from "@anthropic-ai/sdk";
import {
  isVyraTextBanned,
  VYRA_BASE_RULES_EN,
  VYRA_BASE_RULES_ZH,
  VYRA_BRIEF_RULES_EN,
  VYRA_BRIEF_RULES_ZH,
} from "@/lib/vyra/compliance";
import type { VyraBriefData, VyraRegion, VyraSignal } from "@/lib/vyra/types";

const MODEL = "claude-haiku-4-5-20251001";

export interface VyraNarrativeSegment {
  signalIndex: number;
  text: string;
}

export interface VyraNarrativeResult {
  intro: string;
  narrative: VyraNarrativeSegment[];
}

export interface VyraNarrativeContext {
  region: VyraRegion;
  regionLabel: string;
  operatorNames: string;
  isDrawDay: boolean;
  longestCold?: { number: string; days: number } | null;
}

function templateForSignal(signal: VyraSignal, lang: "zh" | "en"): string {
  const d = signal.data;
  switch (signal.type) {
    case "digit_surge": {
      const digit = d.digit ?? 0;
      const n = d.windowDays ?? 7;
      const p = Math.round(Number(d.proportion ?? 0) * 1000) / 10;
      const kind =
        d.digitType === "head"
          ? lang === "zh"
            ? "头数"
            : "leading digit"
          : lang === "zh"
            ? "尾数"
            : "last digit";
      return lang === "zh"
        ? `${kind}${digit}近${n}天开出占比${p}%,高于历史常态。`
        : `${kind} ${digit} accounted for ${p}% of hits in the last ${n} days, above its historical norm.`;
    }
    case "overdue": {
      const num = String(d.number ?? signal.numbers[0] ?? "----");
      const days = d.currentGap ?? 0;
      const ratio = d.ratio ?? 0;
      return lang === "zh"
        ? `${num}已${days}天未开,达平均周期${ratio}倍。`
        : `${num} has not hit for ${days} days, ${ratio}× its average gap.`;
    }
    case "score_jump": {
      const num = String(d.number ?? signal.numbers[0] ?? "----");
      const delta = Number(d.delta ?? 0);
      const dir =
        delta >= 0
          ? lang === "zh"
            ? "升"
            : "up"
          : lang === "zh"
            ? "降"
            : "down";
      const abs = Math.abs(delta);
      const scopeNote =
        d.scope === "all"
          ? lang === "zh"
            ? "(全网口径)"
            : "(all-operator scope)"
          : "";
      return lang === "zh"
        ? `${num}评分7天${dir}${abs}分${scopeNote}。`
        : `${num} score ${dir} ${abs} pts over 7 days ${scopeNote}.`.trim();
    }
    case "mirror_sync": {
      const nums = signal.numbers;
      const a = nums[0] ?? "----";
      const b = nums[1] ?? "----";
      const n = d.windowDays ?? 14;
      return lang === "zh"
        ? `${a}与镜像${b}近${n}天内双双开出。`
        : `${a} and mirror ${b} both hit within the last ${n} days.`;
    }
    default:
      return lang === "zh" ? "数据面出现统计异动。" : "A statistical anomaly was recorded.";
  }
}

function templateIntro(
  brief: VyraBriefData,
  ctx: VyraNarrativeContext,
  lang: "zh" | "en"
): string {
  if (brief.quiet) {
    const cold = ctx.longestCold;
    if (lang === "zh") {
      const coldBit = cold
        ? `该区最长冷藏纪录为${cold.number},已${cold.days}天未开。`
        : "";
      return `今日${ctx.regionLabel}数据面平静。${coldBit}`;
    }
    const coldBit = cold
      ? `Longest cold streak in this scope: ${cold.number} at ${cold.days} days.`
      : "";
    return `Today's ${ctx.regionLabel} data is calm. ${coldBit}`.trim();
  }
  const drawHint = ctx.isDrawDay
    ? lang === "zh"
      ? "今晚有开彩。"
      : "Draw day tonight."
    : lang === "zh"
      ? "今日非开彩日。"
      : "Not a draw day today.";
  return lang === "zh"
    ? `${brief.date} ${ctx.regionLabel}简报,${drawHint}运营商:${ctx.operatorNames}。`
    : `${brief.date} ${ctx.regionLabel} brief — ${drawHint} Operators: ${ctx.operatorNames}.`;
}

function templateNarrative(
  brief: VyraBriefData,
  lang: "zh" | "en"
): VyraNarrativeResult {
  return {
    intro: "",
    narrative: brief.signals.map((s, i) => ({
      signalIndex: i,
      text: templateForSignal(s, lang),
    })),
  };
}

function parseNarrativeJson(raw: string): VyraNarrativeResult | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as VyraNarrativeResult;
    if (typeof parsed.intro !== "string" || !Array.isArray(parsed.narrative)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function qcNarrative(
  result: VyraNarrativeResult,
  brief: VyraBriefData,
  lang: "zh" | "en",
  ctx: VyraNarrativeContext
): VyraNarrativeResult {
  const intro = isVyraTextBanned(result.intro)
    ? templateIntro(brief, ctx, lang)
    : result.intro;

  const narrative = brief.signals.map((signal, i) => {
    const seg = result.narrative.find((n) => n.signalIndex === i);
    const text = seg?.text ?? templateForSignal(signal, lang);
    return {
      signalIndex: i,
      text: isVyraTextBanned(text) ? templateForSignal(signal, lang) : text,
    };
  });

  return {
    intro: intro || templateIntro(brief, ctx, lang),
    narrative,
  };
}

async function callClaudeBrief(
  anthropic: Anthropic,
  lang: "zh" | "en",
  payload: Record<string, unknown>,
  retryNote?: string
): Promise<string | null> {
  const system =
    lang === "zh"
      ? `${VYRA_BASE_RULES_ZH}${VYRA_BRIEF_RULES_ZH}`
      : `${VYRA_BASE_RULES_EN}${VYRA_BRIEF_RULES_EN}`;

  const userContent = retryNote
    ? `${JSON.stringify(payload)}\n\n${retryNote}`
    : JSON.stringify(payload);

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const text =
    msg.content[0]?.type === "text" ? msg.content[0].text.trim() : null;
  return text;
}

/** Generate intro + per-signal narrative; JSON from Claude with template fallback. */
export async function generateBriefNarrative(
  briefData: VyraBriefData,
  lang: "zh" | "en",
  ctx: VyraNarrativeContext
): Promise<VyraNarrativeResult> {
  const fallback = templateNarrative(briefData, lang);
  fallback.intro = templateIntro(briefData, ctx, lang);

  if (briefData.quiet) {
    return { intro: templateIntro(briefData, ctx, lang), narrative: [] };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;

  const payload = {
    brief: briefData,
    context: ctx,
    lang,
  };

  try {
    const anthropic = new Anthropic({ apiKey });
    let raw = await callClaudeBrief(anthropic, lang, payload);
    let parsed = raw ? parseNarrativeJson(raw) : null;

    if (!parsed) {
      const retryNote =
        lang === "zh"
          ? "上一稿不是合法JSON,请严格输出 {\"intro\":\"...\",\"narrative\":[{\"signalIndex\":0,\"text\":\"...\"}]}"
          : "Previous output was not valid JSON. Output strict JSON only.";
      raw = await callClaudeBrief(anthropic, lang, payload, retryNote);
      parsed = raw ? parseNarrativeJson(raw) : null;
    }

    if (!parsed) return fallback;

    if (parsed.narrative.length !== briefData.signals.length) {
      parsed.narrative = briefData.signals.map((s, i) => {
        const existing = parsed!.narrative.find((n) => n.signalIndex === i);
        return {
          signalIndex: i,
          text: existing?.text ?? templateForSignal(s, lang),
        };
      });
    }

    if (!parsed.intro) parsed.intro = templateIntro(briefData, ctx, lang);

    return qcNarrative(parsed, briefData, lang, ctx);
  } catch (e) {
    console.warn("[vyra-narrative] Claude failed:", e);
    return fallback;
  }
}

export { templateForSignal, templateIntro };
