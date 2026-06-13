import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { NumberScoreRow } from "@/lib/score/compute";
import { scopeKeyFromUrlOperators } from "@/lib/score/config";
import { getScoreTrend, weeklyDelta } from "@/lib/score/snapshots";

const MODEL = "claude-haiku-4-5-20251001";
const QC_FAILED_MARKER = "__QC_FAILED__";

/** v2 operator → 本地叫法 */
const OPERATOR_LOCAL: Record<string, { zh: string; en: string }> = {
  magnum: { zh: "万能", en: "Magnum" },
  damacai: { zh: "大马彩", en: "Damacai" },
  toto: { zh: "多多", en: "Toto" },
  singapore: { zh: "新加坡", en: "Singapore Pools" },
  sabah88: { zh: "沙巴88", en: "Sabah 88" },
  stc: { zh: "山打根", en: "STC" },
  cashsweep: { zh: "大伯公", en: "Cash Sweep" },
};

const SYSTEM_ZH = `你是 VYRA,Check4D Terminal 的数据解读,帮马来西亚和新加坡马票用户看懂一组 4D 字的历史数据。

文风(kopitiam,不是写报告):
· 像在茶餐室跟买字的朋友聊天:短句、直接、大白话,别文绉绉
· 禁用书面腔:蛮勤/动静/节奏/活性/沉寂/复苏/运作/维度/加权
· 测试标准:这句话跟朋友讲,会不会太像论文——会就重写
· 说「开」不说「出现」;奖项用头奖/二奖/三奖/特别奖/安慰奖
· 运营商用本地叫法(万能/多多/大马彩/新加坡/沙巴88/山打根/大伯公)
· 量词用「组」——「这组字」「一组字」,不说条/粒/个号码

铁律(不可违反):
1. 每个判断必须落在给定数据上,不编造数据包没有的事
2. 严禁预测、严禁任何期待框架(这条绝不动):
   禁用「值得/不值得+任何动词」「可以留意」「机会」「窗口」
   「想象空间」「复苏」「回归」「蓄势」「酝酿」「该开了」「快到了」;
   也禁止「还没到XX的位置/状态」这类暗示临界点的句式;
   严禁机械/临界隐喻:「触发点」「临界」「启动」「运作中」「发力」「引爆」等;
   结尾只能客观收束「现在怎样」,不能指向未来、不能暗示该开
3. 综合活跃度(overall_score)高或低时,用人话讲原因和局限(例如刚开过所以「最近有开」)
4. 100-150字,直接进入,不要问候语,不要免责声明(页面已有)
5. 纯文本:禁止 Markdown(**、#、列表),不要小标题,两三段连贯话

人话规则(维度——禁止学术分):
6. 禁止把四维写成「X分」或报具体分数:
   禁「频率分/周期分/动能分/活性分/综合分 + 数字」,禁 scores 里任何 XX 分
   根据 scores 高低(相对 50,结合 total_hits/hits_30d/hits_90d)翻成口语:
   · freq 高 → 「开得比较多/历史上常开」; 低 → 「很少开/开得不算多」
   · cycle(看 gap_status/gap_vs_avg) → 「上次开到现在没多久/拖比较久/比平常隔更久」
     只陈述间隔长短,禁「周期分」;比较长短必须依据 gap_status
   · momentum 低/0 → 「最近很少开/最近很冷」; 高 → 「最近有开/最近比较常出」
   · mirror_number → 文案一律称「反字 XXXX」(本地叫法,禁「镜像字/镜像」)
     高 → 「反字 XXXX 最近开得比较多」; 低 → 「反字 XXXX 最近很少开」
7. 禁止统计术语:z值/σ/标准差/分位/百分位/体系/格局/口径/维度/加权
   内部字段名(gap_status、gap_vs_avg、far_below_avg 等)严禁出现在文案里

间隔说约数(数据是天,输出禁精确天数):
8. current_gap_days、avg_gap_days 仅供判断长短,文案禁止出现:
   · 带小数的天数(如 386.8天)
   · 任何「数字+天」(如 7天、117天)——一律改约数
   · 「X天没开/间隔X天/平均X天」类精确报数
   改说有体感的约数:
   · ≤14天 → 「上礼拜刚开/最近才开/上次开到现在没多久」
   · 15-45天 → 「一个多礼拜/快一个月没开」
   · 46-120天 → 「两三个月/快四个月没开」
   · 121-365天 → 「大半年/快一年没开」; 平均 → 「平常大概大半年才开一次」
   · >365天 → 「一年多/好几年没开」; 平均 → 「平常要蛮久才开一次/平均一年多才开一次」
   · 与平均比:依据 gap_status 说「比平常隔得短/拖比较久/已经比平常隔更久」,
     禁报 gap_vs_avg 百分比,禁「只有平均的70%」这类机器说法
9. total_hits 可说「历史上开过 X 次」(整数可保留);last_seen_date 可说「上次开是YYYY年M月」

结尾(口语收束,不预测):
10. 最后一句用「总的来说/整体看/总之」收束,例如:
    「总的来说,这组字最近很少开。」
    「整体看,这组字一直开得比较多。」
    「总之,最近有开,但平时不算多。」
    禁学术状态词:沉寂期/活跃期/低频状态/停滞状态/周期早段/超长间隔状态
    说完即止,不准再接「但/不过/如果/等」

文风示例(模仿语气,数字按数据包换,不要照抄):
· 冷号:在万能这边,5576 历史上开过 23 次,上次开是去年中,快四个月没开了。平常大概大半年才开一次,这次拖比较久。反字 6755 最近也很少开。总的来说,这组字最近很少开。
· 刚开过:这组字上礼拜在多多刚开,最近有开,不过历史上开得不算多。反字最近也很少出。总之,最近有开,但平时不算多。
· 常开:全部运营商加起来,这组字开得算多,最近三个月也开了几次。上次开到现在没多久,跟平时差不多。整体看,这组字一直开得比较多。`;

const SYSTEM_EN = `You are VYRA, Check4D Terminal's data explainer for Malaysian and Singapore 4D players.

Voice (kopitiam chat, not a report):
· Talk like you're explaining to a friend at the coffee shop — short, direct, plain words
· No report-speak or jargon; litmus test: would your kopitiam friend laugh at how formal this sounds?
· Say numbers "came out" or "hit"; use 1st/2nd/3rd Prize, Special, Consolation
· Operators: Magnum, Toto, Damacai, Singapore Pools, Sabah 88, STC, Cash Sweep

Hard rules (never break):
1. Ground every claim in the data pack only
2. Never predict or nudge action (UNCHANGED):
   Forbidden: worth + any verb, keep an eye on, opportunity, due, overdue,
   expected to return, good sign, window, buildup, trigger, critical level,
   gearing up, comeback, revival — including negated forms implying a threshold
3. When overall activity is high or low, explain why in plain words (e.g. hit recently)
4. 80-130 words, no greeting, no disclaimer
5. Plain text only, no Markdown

Plain language (dimensions — no score jargon):
6. Never write "frequency score 39" or any dimension/overall score number
   Translate from scores (vs ~50, plus hits_30d/90d):
   · freq high → "hits fairly often / comes out quite a bit"; low → "rarely comes out"
   · cycle (use gap_status) → "not long since last hit / been a while / longer than usual"
   · momentum low → "hardly any recent hits / cold lately"; high → "hit recently / some recent action"
   · mirror_number → call it "mirror XXXX" (keep "mirror" in English); busy or quiet lately
7. No jargon: z-score, sigma, std dev, percentile, system, landscape, weighting
   Never expose internal field names

Rounded time (days in data, never exact in output):
8. current_gap_days and avg_gap_days are for judgment only — never print exact day counts or decimals
   Use rounded phrases: "just last week", "nearly four months quiet", "usually every six months or so", "over a year dry"
   ≤14d → just last week / not long since last hit; 15-45 → nearly a month; 46-120 → a few months / nearly four months;
   121-365 → about half a year; >365 → over a year
   Compare using gap_status only — shorter or longer than usual; never percentages

Ending (plain, no forecast):
9. Close with "Overall," / "In short," / "All in all," — plain state only
   No academic labels: dormant phase, active phase, low-frequency state, etc.
   Full stop; no but/however/if

Few-shot tone (swap in payload numbers):
· Cold: "On Magnum, 5576 has hit 23 times — last seen mid last year, nearly four months quiet. Usually every six months or so; this stretch is longer than usual. Mirror 6755 rarely hits lately. Overall, this number rarely comes out lately."
· Recent: "Hit on Toto just last week — some recent action, but not historically frequent. Mirror quiet too. In short, hit recently, but not a regular."
· Frequent: "Across all operators, comes out quite a bit — a few hits in three months. Not long since last hit, roughly usual. All in all, this number hits fairly often."`;

const BANNED_ZH =
  /值得|留意|机会|窗口|想象空间|复苏|回温|回归|蓄势|酝酿|该开|快到|触发|临界|启动|发力|引爆|停摆|开号|可控范围|走势|想等|在动|gap_status|gap_vs_avg|far_below_avg|below_avg|above_avg|far_above_avg|scope_label|dataPack|(?:频率|周期|动能|活性|综合)分\s*\d+|\d+\s*(?:频率|周期|动能|活性)分|z值|σ|标准差|分位|百分位|体系|格局|口径|维度|加权|沉寂期|活跃期|低频状态|停滞状态|周期早段|超长间隔状态|活性分|镜像字|镜像|蛮勤|动静|节奏|\d+\.\d+\s*天|\d+\s*天/;
const BANNED_EN =
  /\b(worth|due|overdue|opportunity|keep an eye|trigger|critical level|gearing up|firing|comeback|revival|gap_status|gap_vs_avg|far_below_avg|scope_label|dataPack|frequency score|cycle score|momentum score|mirror score|activity score|\d+\s*points?\b|z-score|z value|sigma|std dev|standard deviation|percentile|tier system|landscape|dormant phase|active phase|low-frequency|stalled state|extended-gap|\d+\.\d+\s*days?\b|\d+\s*days?\b)/i;

const RETRY_NOTE_ZH =
  "上一稿包含禁用表述(预测词/精确天数/维度分/术语/镜像/文绉词),重写,严格遵守铁律2与人话规则6-10";
const RETRY_NOTE_EN =
  "Previous draft had forbidden phrasing (predictions, exact day counts, score jargon, jargon). Rewrite; follow hard rule 2 and plain-language rules 6-10.";

function cleanInsightText(text: string): string {
  return text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
}

function isBannedInsight(clean: string): boolean {
  // 字段名中英都扫,防中文稿夹英文字段
  if (BANNED_ZH.test(clean) || BANNED_EN.test(clean)) return true;
  return false;
}

function buildUserMessage(
  dataPack: Record<string, unknown>,
  lang: "zh" | "en",
  extraNote?: string
): string {
  const base =
    lang === "zh"
      ? `号码数据包(JSON):
${JSON.stringify(dataPack)}

字段说明(内部代号,不要出现在文案里):
· overall_score: 0-100 综合活跃度(越高越活跃);文案禁报分数,只讲人话
· scores.freq / cycle / momentum / mirror: 四维参考(0-100);文案禁「X分」,按 system 人话规则描述
· total_hits, hits_30d, hits_90d: 开出次数;可说整数次数
· current_gap_days, avg_gap_days: 间隔天数(日历天,仅供判断长短);文案必须换算成口语约数,禁精确天数/小数/「数字+天」
· gap_vs_avg, gap_status: 间隔相对平均的位置;文案只用来判断「比平常短/长/拖比较久」,禁报百分比和字段名
· gap_status 含义: far_below_avg=远短于平均/below_avg=短于平均/above_avg=长于平均/far_above_avg=远长于平均
· scope_label: 数据口径(${dataPack.scope_label});必须点出口径(例:只选万能→「在万能这边」)
· mirror_number: 反字号码(文案称「反字 XXXX」,禁写镜像/镜像字)
· weekly_score_change: 7日综合分变化(null=快照不足);可说最近一周有变/没什么变,禁报具体分差

铁律追加:间隔长短比较必须依据 gap_status,禁止自行比较两个精确天数;输出禁止精确天数和小数天数,必须约数口语。`
      : `Number data pack (JSON):
${JSON.stringify(dataPack)}

Field notes (internal codes — never appear in output):
· overall_score: 0-100 overall activity; never print the number, plain words only
· scores.freq / cycle / momentum / mirror: four dimensions (0-100); never "X points/score", use plain-language rules
· total_hits, hits_30d, hits_90d: hit counts; integer counts OK in copy
· current_gap_days, avg_gap_days: calendar days for your judgment only; output rounded phrases, never exact day counts or decimals
· gap_vs_avg, gap_status: gap vs average; use for shorter/longer than usual only; never percentages or field names
· gap_status: far_below_avg / below_avg / above_avg / far_above_avg
· scope_label: data scope (${dataPack.scope_label}); name the scope in copy
· mirror_number: mirror pair (say "mirror XXXX" in English)
· weekly_score_change: 7-day overall change (null = insufficient snapshots); no exact delta numbers

Hard rule add-on: compare gap length using gap_status only; never exact day counts in output — rounded phrases only.`;
  return extraNote ? `${base}\n\n${extraNote}` : base;
}

async function callClaudeAndClean(
  anthropic: Anthropic,
  lang: "zh" | "en",
  userContent: string
): Promise<string | null> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 350,
    system: lang === "zh" ? SYSTEM_ZH : SYSTEM_EN,
    messages: [{ role: "user", content: userContent }],
  });
  const text =
    msg.content[0]?.type === "text" ? msg.content[0].text.trim() : null;
  if (!text) return null;
  return cleanInsightText(text);
}

/** 调用 Claude 并 clean,命中违禁词则重试一次,仍命中返回 qcFailed */
async function generateInsightContent(
  anthropic: Anthropic,
  lang: "zh" | "en",
  dataPack: Record<string, unknown>
): Promise<string | "qc_failed" | null> {
  const first = await callClaudeAndClean(
    anthropic,
    lang,
    buildUserMessage(dataPack, lang)
  );
  if (!first) return null;
  if (!isBannedInsight(first)) return first;

  const retryNote = lang === "zh" ? RETRY_NOTE_ZH : RETRY_NOTE_EN;
  const second = await callClaudeAndClean(
    anthropic,
    lang,
    buildUserMessage(dataPack, lang, retryNote)
  );
  if (!second || isBannedInsight(second)) return "qc_failed";
  return second;
}

/** AI 专用:精确 scope 查分,不回退 all */
async function getScoreExact(
  number: string,
  scope: string
): Promise<NumberScoreRow | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("number_scores")
    .select("*")
    .eq("number", number)
    .eq("scope", scope)
    .maybeSingle();
  return data ? (data as NumberScoreRow) : null;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** 只读缓存,不调 Claude — 供 SSR 注入 */
export async function getCachedInsight(
  number: string,
  lang: "zh" | "en",
  urlOperators: string[] = []
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const scope = scopeKeyFromUrlOperators(urlOperators);
  const { data } = await supabase
    .from("ai_insights")
    .select("content")
    .eq("number", number)
    .eq("insight_date", todayISO())
    .eq("lang", lang)
    .eq("scope", scope)
    .maybeSingle();
  if (!data?.content || data.content === QC_FAILED_MARKER) return null;
  return data.content;
}

/** 缓存优先;miss 则生成并写缓存;任何失败返回 null(前端降级模板) */
export async function getOrCreateInsight(
  number: string,
  lang: "zh" | "en",
  urlOperators: string[] = []
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const today = todayISO();
  const scope = scopeKeyFromUrlOperators(urlOperators);

  const { data: cached } = await supabase
    .from("ai_insights")
    .select("content")
    .eq("number", number)
    .eq("insight_date", today)
    .eq("lang", lang)
    .eq("scope", scope)
    .maybeSingle();
  if (cached?.content === QC_FAILED_MARKER) return null;
  if (cached?.content) return cached.content;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const score = await getScoreExact(number, scope);
  const trend = await getScoreTrend(number, 14);
  if (!score) return null;

  const dataPack = {
    number,
    scope_label:
      scope === "all"
        ? lang === "zh"
          ? "全部运营商合并"
          : "all operators combined"
        : scope
            .split("+")
            .map((op) => OPERATOR_LOCAL[op]?.[lang] ?? op)
            .join(lang === "zh" ? "+" : " + "),
    overall_score: score.overall_score,
    scores: {
      freq: score.freq_score,
      cycle: score.cycle_score,
      momentum: score.momentum_score,
      mirror: score.mirror_score,
    },
    total_hits: score.total_hits,
    hits_30d: score.hits_30d,
    hits_90d: score.hits_90d,
    current_gap_days: score.current_gap_days,
    avg_gap_days: score.avg_gap_days,
    gap_vs_avg:
      score.current_gap_days != null && score.avg_gap_days
        ? Math.round((score.current_gap_days / score.avg_gap_days) * 100)
        : null,
    gap_status:
      score.current_gap_days != null && score.avg_gap_days
        ? score.current_gap_days < score.avg_gap_days * 0.5
          ? "far_below_avg"
          : score.current_gap_days < score.avg_gap_days
            ? "below_avg"
            : score.current_gap_days < score.avg_gap_days * 1.5
              ? "above_avg"
              : "far_above_avg"
        : null,
    max_gap_days: score.max_gap_days,
    first_seen_date: score.first_seen_date,
    last_seen_date: score.last_seen_date,
    weekly_score_change: weeklyDelta(trend),
    mirror_number: number.split("").reverse().join(""),
    operator_names: OPERATOR_LOCAL,
  };

  try {
    const anthropic = new Anthropic({ apiKey });
    const result = await generateInsightContent(anthropic, lang, dataPack);
    if (result === "qc_failed") {
      const { error: qcUpsertErr } = await supabase.from("ai_insights").upsert(
        {
          number,
          insight_date: today,
          lang,
          scope,
          content: QC_FAILED_MARKER,
        },
        { onConflict: "number,insight_date,lang,scope" }
      );
      if (qcUpsertErr)
        console.error("ai_insights upsert failed:", qcUpsertErr.message);
      return null;
    }
    if (!result) return null;

    const { error: upsertErr } = await supabase.from("ai_insights").upsert(
      { number, insight_date: today, lang, scope, content: result },
      { onConflict: "number,insight_date,lang,scope" }
    );
    if (upsertErr) console.error("ai_insights upsert failed:", upsertErr.message);
    return result;
  } catch (e) {
    console.error("AI insight error:", e);
    return null;
  }
}