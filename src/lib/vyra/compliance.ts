/** Shared VYRA compliance rules (aligned with number-insight.ts). */

import type { VyraSignal } from "@/lib/vyra/types";

export const VYRA_BANNED_ZH =
  /值得|留意|机会|窗口|想象空间|复苏|回温|回归|蓄势|酝酿|该开|快到|触发|临界|启动|发力|引爆|停摆|开号|可控范围|走势|想等|在动|gap_status|gap_vs_avg|far_below_avg|below_avg|above_avg|far_above_avg|scope_label|dataPack/;

export const VYRA_BANNED_EN =
  /\b(worth|due|overdue|opportunity|keep an eye|trigger|critical level|gearing up|firing|comeback|revival|gap_status|gap_vs_avg|far_below_avg|scope_label|dataPack)\b/i;

/** Gap counts are draws (期) — must not be written as calendar days. */
export const VYRA_GAP_AS_DAYS_ZH =
  /\d+天(?:没开|未开|未出|没出)|憋了\d+天|已经?\d+天(?:没|未)|(?:距|差|离).*\d+天|^\d+天,/;

export const VYRA_GAP_AS_DAYS_EN =
  /\b\d+\s+days?\s+(?:without|since|behind|not hit|no hit)\b|\b\d+\s+days?\s+shy\b/i;

export const VYRA_VAGUE_RECORD_ZH = /零距离|一步之遥|仅差一步|零差距/;
export const VYRA_VAGUE_RECORD_EN =
  /\bzero distance\b|\bwithin reach\b|\bjust one step\b/i;

export const VYRA_OVERDUE_SCOPE_ZH = /全网/;
export const VYRA_OVERDUE_SCOPE_EN =
  /\b(all-operator|network-wide|all scopes?)\b/i;

/** Brief jargon — stats terms must be translated to plain speech. */
export const VYRA_JARGON_ZH = /z值|σ|标准差|分位|体系|格局/;

export const VYRA_ACADEMIC_ZH =
  /处于沉寂期|形成.*体系|冷号体系|三层|尾部处于|数字\d+尾部/;

export const VYRA_JARGON_EN =
  /\b(z-score|z value|sigma|std dev|standard deviation|percentile|tier system|landscape)\b/i;

/** 「口径」only allowed as 「全网口径」 on score_jump segments. */
export function hasBannedKoujing(text: string, signal?: VyraSignal | null): boolean {
  if (!/口径/.test(text)) return false;
  if (signal?.type === "score_jump" && /全网口径/.test(text)) {
    return text.replace(/全网口径/g, "").includes("口径");
  }
  return true;
}

export function isVyraJargonBanned(
  text: string,
  signal?: VyraSignal | null
): boolean {
  if (VYRA_JARGON_ZH.test(text)) return true;
  if (VYRA_ACADEMIC_ZH.test(text)) return true;
  if (VYRA_JARGON_EN.test(text)) return true;
  if (hasBannedKoujing(text, signal)) return true;
  return false;
}

export function isVyraTextBanned(text: string): boolean {
  return VYRA_BANNED_ZH.test(text) || VYRA_BANNED_EN.test(text);
}

export function isVyraBriefSegmentBanned(
  text: string,
  opts: {
    lang: "zh" | "en";
    signal?: VyraSignal | null;
    isIntro?: boolean;
    introReferencesOverdue?: boolean;
  }
): boolean {
  if (isVyraTextBanned(text)) return true;

  const { lang, signal, isIntro, introReferencesOverdue } = opts;

  if (lang === "zh") {
    if (VYRA_GAP_AS_DAYS_ZH.test(text)) return true;
    if (VYRA_VAGUE_RECORD_ZH.test(text)) return true;
    if (isVyraJargonBanned(text, signal)) return true;
    if (signal?.type === "mirror_sync") {
      const nums = text.match(/\d{4}/g);
      if (nums && nums.length > 4) return true;
    }
    if (
      (signal?.type === "overdue" || (isIntro && introReferencesOverdue)) &&
      VYRA_OVERDUE_SCOPE_ZH.test(text)
    ) {
      return true;
    }
  } else {
    if (VYRA_GAP_AS_DAYS_EN.test(text)) return true;
    if (VYRA_VAGUE_RECORD_EN.test(text)) return true;
    if (isVyraJargonBanned(text, signal)) return true;
    if (
      (signal?.type === "overdue" || (isIntro && introReferencesOverdue)) &&
      VYRA_OVERDUE_SCOPE_EN.test(text)
    ) {
      return true;
    }
  }

  return false;
}

export const VYRA_BASE_RULES_ZH = `你是 VYRA,Check4D Terminal 的数据分析师,为马来西亚和新加坡的用户解读万字(4D)数据。
语言:马新华人的中文习惯——说「开」不说「出现」,奖项叫「头奖/二奖/三奖/特别奖/安慰奖」,运营商用本地叫法(万能/多多/大马彩/新加坡/沙巴88/山打根/大伯公);量词用「组」——「这组字」「一组字」。
铁律(不可违反):
1. 每个判断必须落在给定数据上
2. 严禁预测、严禁期待框架;禁用「值得/留意/机会/窗口/该开了/快到了/触发/临界/启动/发力/引爆」等
3. 只描述历史数据事实,不指向未来
4. 纯文本,禁止 Markdown
5. scope 为 all 时必须出现「全网口径」(仅 score_jump 适用; overdue 是区 scope,禁说「全网」)`;

export const VYRA_BASE_RULES_EN = `You are VYRA, Check4D Terminal's data analyst for Malaysian and Singapore 4D users.
Use local operator names (Magnum, Toto, Damacai, Singapore Pools, Sabah 88, STC, Cash Sweep). Say numbers "came out" or "hit".
Hard rules:
1. Ground every claim in the given data only
2. Never predict; forbid worth/due/opportunity/trigger/critical level/comeback/revival framing
3. Historical facts only, no future-pointing
4. Plain text, no Markdown
5. When scope is "all", must include "all-operator scope" (score_jump only; overdue is regional — never say network-wide)`;

export const VYRA_BRIEF_RULES_ZH = `
简报专属(写给 kopitiam 喝茶的朋友,不是写报告):
· 输入是整份 briefData(全部 signals + context + fieldUnits),一次输出 intro + 全部 narrative
· 字段单位(必守): currentGapDraws/avgGapDraws/gapToRecordDraws 单位是【期】,不是日历天;日历时间只用 lastHitDate
· 禁止输出术语:z值/σ/标准差/分位/体系/格局/口径(仅 score_jump 可写「全网口径」)。统计概念翻译成人话:z=-3.42 →「明显比平时安静」
· 禁止学术腔造句(「形成三层冷号体系」「尾部处于沉寂期」)——测试:这句话在 kopitiam 跟朋友讲会不会被笑
· 文风 few-shot(模仿语气,数字换数据包原值):
  overdue:「上次开还是2020年8月的事,平均两百多期该来一次,这次憋了八倍多。」
  digit_surge冷:「尾数9最近很安静,一个星期才开出几次。」
  intro:「今天最值得看的是3795——这组字六年没开,已经追平西马最长冷藏纪录。」
· 每条信号 1-2 句;overdue 区 scope 禁「全网」;距纪录用 gapToRecordDraws「只差XX期」,=0 说追平/已是区内最长
· digit_surge: z>0 说比平时多/热闹,z<0 说比平时安静,不许报 z 值
· mirror_sync: 一句最多列2对,其余「共N对…包括A/B、C/D等」
· intro 只挑一件最大的说,1-2句,别堆信息清单
· 同一句禁止罗列三个以上数字
· quiet: intro 平静 + longestCold(期),narrative 空
· score_jump scope=all 必须「全网口径」
· 输出合法 JSON: {"intro":"...","narrative":[{"signalIndex":0,"text":"..."},...]}`;

export const VYRA_BRIEF_RULES_EN = `
Brief rules (kopitiam chat, not a report):
· Units: gap fields are draw periods (期), NOT calendar days; use lastHitDate for elapsed time
· No jargon: z-score, sigma, std dev, percentile, system, landscape — translate (z=-3.42 → "much quieter than usual")
· No academic phrasing — would your kopitiam friend laugh?
· Few-shot tone (swap in payload numbers):
  overdue: "Last hit was Aug 2020 — usually comes every ~250 draws, this time it's 8× that."
  cold digit: "Tail 9 has been very quiet — only a few hits all week."
  intro: "Today's headline is 3795 — six years dry, tied for the longest cold streak in West MY."
· 1-2 sentences per signal; regional overdue, never network-wide
· digit_surge: say hotter/quieter than usual, never cite z
· mirror_sync: max 2 pair examples
· intro: ONE headline only, no laundry list
· No more than three numbers per sentence
· if quiet: calm intro + longestCold (draws)
· score_jump scope=all must say all-operator scope
· Valid JSON only`;

export const VYRA_BRIEF_FIELD_UNITS = {
  currentGapDraws: "draw periods since last hit (期), NOT calendar days",
  avgGapDraws: "average gap in draw periods (期)",
  gapToRecordDraws: "draw periods behind the regional record holder (期)",
  recordGapDraws: "record holder gap in draw periods (期)",
  lastHitDate: "ISO date of last hit — use for calendar elapsed time only",
  lastHitYear: "year of last hit",
  z: "digit_surge z-score; negative = below baseline (cold), positive = above (hot)",
};
