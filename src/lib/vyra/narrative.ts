import Anthropic from "@anthropic-ai/sdk";
import { briefDataForNarrative, parseSignalContext } from "@/lib/vyra/data-loader";
import {
  isVyraBriefSegmentBanned,
  VYRA_BASE_RULES_EN,
  VYRA_BASE_RULES_ZH,
  VYRA_BRIEF_RULES_EN,
  VYRA_BRIEF_RULES_ZH,
} from "@/lib/vyra/compliance";
import { digitSurgeVariant } from "@/lib/vyra/signal-labels";
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
  longestCold?: { number: string; draws: number } | null;
}

function formatLastHitPhrase(
  lastHitDate: string | undefined,
  lang: "zh" | "en"
): string {
  if (!lastHitDate || lastHitDate.length < 7) return "";
  const [y, m] = lastHitDate.split("-");
  if (lang === "zh") {
    return `上次开还是${y}年${parseInt(m, 10)}月的事,`;
  }
  return `Last hit was ${y}-${parseInt(m, 10)}, `;
}

function yearsSinceLastHit(lastHitDate: string | undefined): number | null {
  if (!lastHitDate || lastHitDate.length < 4) return null;
  const y = parseInt(lastHitDate.slice(0, 4), 10);
  if (!Number.isFinite(y)) return null;
  return Math.max(1, new Date().getFullYear() - y);
}

function roughAvgDrawsPhrase(avgDraws: number, lang: "zh" | "en"): string {
  const n = Math.max(10, Math.round(avgDraws / 50) * 50);
  if (lang === "zh") {
    if (n >= 100) {
      const hundreds = Math.round(n / 100);
      return `平均${hundreds}百多期该来一次,`;
    }
    return `平均${n}多期该来一次,`;
  }
  return `usually every ~${n} draws, `;
}

function ratioColloquial(ratio: number, lang: "zh" | "en"): string {
  const r = Math.round(ratio * 10) / 10;
  if (lang === "zh") {
    if (r >= 2) return `这次憋了${Math.floor(r)}倍多。`;
    return `大概是平常的${r}倍。`;
  }
  if (r >= 2) return `this time it's ${Math.floor(r)}× that.`;
  return `about ${r}× the usual gap.`;
}

function overdueRecordPhrase(
  ctx: Record<string, number | string>,
  lang: "zh" | "en"
): string {
  const gap = ctx.gapToRecordDraws;
  if (gap == null || gap === "") return "";
  const n = Number(gap);
  if (!Number.isFinite(n)) return "";
  if (n === 0) {
    return lang === "zh"
      ? "已经追平区内最长冷藏纪录。"
      : "Tied for the longest cold streak in this region.";
  }
  if (n > 0) {
    return lang === "zh"
      ? `离区内最长纪录还差${n}期。`
      : `${n} draws behind the regional record.`;
  }
  return "";
}

function templateForSignal(signal: VyraSignal, lang: "zh" | "en"): string {
  const d = signal.data;
  const ctx = parseSignalContext(signal);

  switch (signal.type) {
    case "digit_surge": {
      const digit = d.digit ?? 0;
      const hot = digitSurgeVariant(signal) === "hot";
      const kind =
        d.digitType === "head"
          ? lang === "zh"
            ? "头数"
            : "leading digit"
          : lang === "zh"
            ? "尾数"
            : "tail digit";
      const lastActive = ctx.lastActiveDate;

      if (lang === "zh") {
        let s = hot
          ? `${kind}${digit}最近特别热闹,开出的次数比平时多。`
          : `${kind}${digit}最近很安静,一个星期才开出几次。`;
        if (lastActive) {
          s += hot
            ? `上次这么热闹是${String(lastActive).slice(0, 7)}左右。`
            : `上次也这么安静是${String(lastActive).slice(0, 7)}左右。`;
        }
        return s;
      }

      let s = hot
        ? `${kind} ${digit} has been unusually busy lately — more hits than usual.`
        : `${kind} ${digit} has been very quiet — only a few hits all week.`;
      if (lastActive) {
        s += hot
          ? ` Last this active around ${String(lastActive).slice(0, 7)}.`
          : ` Last this cold around ${String(lastActive).slice(0, 7)}.`;
      }
      return s;
    }
    case "overdue": {
      const num = String(d.number ?? signal.numbers[0] ?? "----");
      const ratio = Number(d.ratio ?? 0);
      const avgDraws = Number(d.avgGapDraws ?? d.avgGap ?? 0);
      const lastHit =
        (typeof d.lastSeenDate === "string" && d.lastSeenDate) ||
        (typeof ctx.lastHitDate === "string" ? ctx.lastHitDate : undefined);

      if (lang === "zh") {
        let s = `${num}${formatLastHitPhrase(lastHit, lang)}${avgDraws > 0 ? roughAvgDrawsPhrase(avgDraws, lang) : ""}${ratioColloquial(ratio, lang)}`;
        if (ctx.coldRank === 1) s += "在这区冷藏排第一。";
        else if (ctx.coldRank) s += `在这区冷藏排第${ctx.coldRank}。`;
        s += overdueRecordPhrase(ctx, lang);
        return s;
      }

      let s = `${num} — ${formatLastHitPhrase(lastHit, lang)}${avgDraws > 0 ? roughAvgDrawsPhrase(avgDraws, lang) : ""}${ratioColloquial(ratio, lang)} `;
      if (ctx.coldRank) s += `Ranked #${ctx.coldRank} coldest in this region. `;
      s += overdueRecordPhrase(ctx, lang);
      return s.trim();
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
            ? "全网口径"
            : "all-operator scope"
          : "";
      if (lang === "zh") {
        let s = `${num}评分一周${dir}了${abs}分`;
        if (scopeNote) s += `(${scopeNote})`;
        s += "。";
        if (ctx.scoreTier === "top5pct") s += "已进入全网前5%。";
        return s;
      }
      let s = `${num} score ${dir} ${abs} pts over the week`;
      if (scopeNote) s += ` (${scopeNote})`;
      s += ".";
      if (ctx.scoreTier === "top5pct") s += " Now in the top 5% network-wide.";
      return s;
    }
    case "mirror_sync": {
      const n = d.windowDays ?? 14;
      const pairCount = Number(d.pairCount ?? Math.floor(signal.numbers.length / 2));
      const pairsRaw = String(d.pairs ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const sample = pairsRaw.slice(0, 2).join("、");
      if (lang === "zh") {
        return sample
          ? `近${n}天共${pairCount}对镜像字组同步开出,包括${sample}等。`
          : `近${n}天共${pairCount}对镜像字组同步开出。`;
      }
      return sample
        ? `${pairCount} mirror pairs both hit within ${n} days, including ${sample.replace(/、/g, ", ")}, etc.`
        : `${pairCount} mirror pairs both hit within ${n} days.`;
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
        ? `最长冷藏是${cold.number},已经${cold.draws}期没开。`
        : "";
      return `今天${ctx.regionLabel}挺平静,没什么大动静。${coldBit}`;
    }
    const coldBit = cold
      ? `Longest cold streak: ${cold.number} at ${cold.draws} draws.`
      : "";
    return `Today's ${ctx.regionLabel} is quiet — nothing major. ${coldBit}`.trim();
  }

  const top = brief.signals[0];
  if (!top) {
    return lang === "zh"
      ? `今天${ctx.regionLabel}没什么特别值得聊的。`
      : `Nothing major in ${ctx.regionLabel} today.`;
  }

  if (top.type === "overdue") {
    const d = top.data;
    const sigCtx = parseSignalContext(top);
    const num = String(d.number ?? top.numbers[0] ?? "----");
    const lastHit =
      (typeof d.lastSeenDate === "string" && d.lastSeenDate) ||
      (typeof sigCtx.lastHitDate === "string" ? sigCtx.lastHitDate : undefined);
    const gapToRecord = Number(sigCtx.gapToRecordDraws ?? NaN);

    if (lang === "zh") {
      const years = yearsSinceLastHit(lastHit);
      const dryBit = years ? `${years}年没开` : `已经${d.currentGapDraws ?? ""}期没开`;
      if (gapToRecord === 0) {
        return `今天最值得看的是${num}——这组字${dryBit},已经追平${ctx.regionLabel}最长冷藏纪录。`;
      }
      return `今天最值得看的是${num}——这组字${dryBit},是${ctx.regionLabel}目前最冷的组字之一。`;
    }

    const years = yearsSinceLastHit(lastHit);
    const dryBit = years ? `${years} years dry` : `${d.currentGapDraws ?? ""} draws dry`;
    if (gapToRecord === 0) {
      return `Today's headline is ${num} — ${dryBit}, tied for the longest cold streak in ${ctx.regionLabel}.`;
    }
    return `Today's headline is ${num} — ${dryBit}, one of the coldest numbers in ${ctx.regionLabel}.`;
  }

  if (top.type === "digit_surge") {
    const digit = top.data.digit ?? 0;
    const kind = top.data.digitType === "head" ? (lang === "zh" ? "头数" : "head") : lang === "zh" ? "尾数" : "tail";
    const hot = digitSurgeVariant(top) === "hot";
    if (lang === "zh") {
      return hot
        ? `今天最值得看的是${kind}${digit}——最近开出的次数比平时多。`
        : `今天最值得看的是${kind}${digit}——最近特别安静,一个星期才开出几次。`;
    }
    return hot
      ? `Today's headline is ${kind} ${digit} — much busier than usual lately.`
      : `Today's headline is ${kind} ${digit} — very quiet, only a few hits all week.`;
  }

  if (lang === "zh") {
    return `今天最值得看的是${ctx.regionLabel}的${signalTypeLabel(top, "zh")}这条。`;
  }
  return `Today's headline in ${ctx.regionLabel}: ${signalTypeLabel(top, "en")}.`;
}

function signalTypeLabel(signal: VyraSignal, lang: "zh" | "en"): string {
  if (signal.type === "digit_surge") {
    const head = signal.data.digitType === "head";
    const hot = digitSurgeVariant(signal) === "hot";
    if (lang === "zh") {
      if (head) return hot ? "头数活跃" : "头数沉寂";
      return hot ? "尾数活跃" : "尾数沉寂";
    }
    if (head) return hot ? "head digit hot" : "head digit cold";
    return hot ? "tail digit hot" : "tail digit cold";
  }

  const map: Record<Exclude<VyraSignal["type"], "digit_surge">, { zh: string; en: string }> = {
    overdue: { zh: "超长冷藏", en: "long cold streak" },
    score_jump: { zh: "评分跳变", en: "score jump" },
    mirror_sync: { zh: "镜像同步", en: "mirror sync" },
  };
  return map[signal.type][lang];
}

function introReferencesOverdue(brief: VyraBriefData): boolean {
  return brief.signals.some((s) => s.type === "overdue");
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
  const overdueInBrief = introReferencesOverdue(brief);

  const introOk = !isVyraBriefSegmentBanned(result.intro, {
    lang,
    isIntro: true,
    introReferencesOverdue: overdueInBrief,
  });
  const intro = introOk ? result.intro : templateIntro(brief, ctx, lang);

  const narrative = brief.signals.map((signal, i) => {
    const seg = result.narrative.find((n) => n.signalIndex === i);
    const candidate = seg?.text ?? templateForSignal(signal, lang);
    const ok = !isVyraBriefSegmentBanned(candidate, {
      lang,
      signal,
      isIntro: false,
      introReferencesOverdue: overdueInBrief,
    });
    return {
      signalIndex: i,
      text: ok ? candidate : templateForSignal(signal, lang),
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
    max_tokens: 1200,
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
    briefData: briefDataForNarrative(briefData),
    meta: {
      region: ctx.region,
      regionLabel: ctx.regionLabel,
      operatorNames: ctx.operatorNames,
      isDrawDay: ctx.isDrawDay,
      longestCold: ctx.longestCold ?? null,
      overdueScope: `${ctx.regionLabel} regional only — never network-wide for overdue`,
    },
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
