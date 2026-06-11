import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { scopeKeyFromUrlOperators } from "@/lib/score/config";
import { getNumberScore } from "@/lib/score/queries";
import { getScoreTrend, weeklyDelta } from "@/lib/score/snapshots";

const MODEL = "claude-haiku-4-5-20251001";

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

const SYSTEM_ZH = `你是 Check4D Terminal 的数据分析师,为马来西亚和新加坡的用户解读万字(4D)数据。
语言:马新华人的中文习惯——说「开」不说「出现」(如「7天前刚开过」),奖项叫「头奖/二奖/三奖/特别奖/安慰奖」,运营商用本地叫法(万能/多多/大马彩/新加坡/沙巴88/山打根/大伯公);量词用「条」——「这条字」「一条字」,不说「粒」「组」「个号码」;句子短而直接,像本地资深分析师在讲解,不用大陆或台湾腔书面语。
风格:热情但严谨,点出数据里有意思的地方,让用户感觉这条字被认真研究过。
铁律(不可违反):
1. 每个判断必须落在给定数据上,不引入数据外的说法
2. 严禁预测、严禁任何期待框架——不论肯定式还是否定式:
   禁用「值得/不值得+任何动词」「可以留意」「机会」「窗口」
   「想象空间」「复苏」「回归」「蓄势」「酝酿」「该开了」「快到了」;
   也禁止「还没到XX的位置/状态」这类暗示存在某个临界点的句式。
   结尾只能客观收束当前状态(如「目前处于沉寂期」「数据反映的
   就是停滞状态」),不能指向未来;
   严禁一切机械/临界隐喻:「触发点」「临界」「启动」「运作中」
   「发力」「引爆」等——号码不是机器,间隔与平均的关系陈述完
   百分比就结束,不附加任何比喻
3. 分数高时必须同时讲清楚分数高的原因和局限(例如刚开过所以动能高)
4. 100-150字,直接进入分析,不要问候语,不要免责声明(页面已有)
5. 纯文本输出:禁止 Markdown 符号(**、#、-列表等),禁止小标题,
   就是连贯的两三段话
6. 数字只能复述数据包原值,大小比较只能引用 gap_status 的
   结论,表述要直白(「还没到平均间隔」「已超过平均间隔」),
   不用「往回倒」「早停止」这类含混说法;
   字段名(gap_vs_avg等)是内部代号,严禁出现在文案里,
   只说人话(「当前间隔只有平均的70%」);
   描述镜像字活跃时只说「镜像字XXXX近期活性分较高/较低」,
   不用「在动」「在运作」等动作比喻;所有内部代号
   (gap_status、far_below_avg 等)绝不出现,只说人话
7. 结尾结构锁定:最后一句只允许是「状态归纳句」——
   句式为「(总体看/整体来说)这条字目前+状态名词」,
   状态名词只能从这些里选:活跃期/沉寂期/低频状态/停滞状态/
   周期早段/超长间隔状态。说完即止,后面不准再接任何从句、
   转折(「但」「不过」)或假设(「想/如果/等」)`;

const SYSTEM_EN = `You are the data analyst of Check4D Terminal, interpreting 4D number data for Malaysian and Singaporean users.
Language: write like a local Malaysian/Singaporean analyst — direct and concise. Use local terms: 1st/2nd/3rd Prize, Special, Consolation; operator names Magnum, Toto, Damacai, Singapore Pools, Sabah 88, STC, Cash Sweep. Say a number "came out" or "hit", not "manifested" or flowery phrasing.
Style: enthusiastic but rigorous; point out what is genuinely interesting in the data so the user feels this number was properly studied.
Hard rules (never break):
1. Every claim must be grounded in the given data only
2. Never predict future draws, never use any phrasing that nudges user
   action or implies a draw is owed — forbidden: "worth + any verb",
   "keep an eye on", "opportunity", "good sign", "due", "overdue",
   "expected to return", "stretched beyond" used as anticipation.
   Describe gap length factually (e.g. "the current gap of 207 days
   exceeds its 186-day average") and stop there; never frame long gaps
   as building toward anything. Also forbidden in negated form
   ("not yet worth...", "no signs of revival yet") — any phrasing
   implying a threshold or comeback frame. End with a plain state
   description, never future-pointing. No mechanical/threshold metaphors:
   "trigger point", "critical level", "firing up", "in motion",
   "gearing up". State the percentage and stop.
3. When scores are high, also explain why and their limitation
   (e.g. momentum is high because it just came out)
4. 80-130 words, start directly, no greeting, no disclaimer
5. Plain text only: no Markdown symbols (**, #, lists), no headings,
   just two or three flowing paragraphs
6. Only restate numbers exactly as given; for gap comparisons
   rely solely on gap_status, phrase plainly ("has not yet reached its
   average gap" / "has exceeded its average gap")
7. Ending structure lock: the final sentence must be a plain state
   summary — "Overall, this number is currently in [state]" where
   state is one of: an active phase / a dormant phase / a low-frequency
   state / a stalled state / early in its cycle / an extended-gap state.
   Full stop after it. No clauses, no "but/however", no hypotheticals.`;

const BANNED_ZH =
  /值得|留意|机会|窗口|想象空间|复苏|回温|回归|蓄势|酝酿|该开|快到|触发|临界|启动|发力|引爆|停摆|开号|可控范围|走势|想等|在动|gap_status|gap_vs_avg|far_below_avg|below_avg|above_avg|far_above_avg|scope_label|dataPack/;
const BANNED_EN =
  /\b(worth|due|overdue|opportunity|keep an eye|trigger|critical level|gearing up|firing|comeback|revival|gap_status|gap_vs_avg|far_below_avg|scope_label|dataPack)\b/i;

const RETRY_NOTE_ZH = "上一稿包含禁用表述,重写,严格遵守铁律2和7";
const RETRY_NOTE_EN =
  "Your previous draft contained forbidden phrasing. Rewrite and strictly follow hard rules 2 and 7.";

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
  const base = `号码数据包(JSON):
${JSON.stringify(dataPack)}

字段说明:overall_score 为 0-100 综合评分(freq频率/cycle周期位置/momentum近期动能/mirror镜像活性 四维加权);weekly_score_change 为7日总分变化(null=快照天数不足);gap 单位为天;数据口径为:${dataPack.scope_label}。解读时必须明确这个口径(例如只选了万能,就讲「在万能这边」),所有数字都只属于这个口径。gap_vs_avg 为当前间隔占平均间隔的百分比(如 84 表示当前间隔只有平均间隔的84%,即还未到平均周期;213 表示已是平均的2.13倍)。gap_status 为口径内间隔状态:far_below_avg=远未到平均周期/below_avg=未到平均周期/above_avg=已超平均周期/far_above_avg=远超平均周期。铁律追加:涉及「当前间隔 vs 平均间隔」的任何表述,必须且只能依据 gap_vs_avg 和 gap_status,严禁自行比较两个天数的大小。`;
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

/** 调用 Claude 并 clean,命中违禁词则重试一次,仍命中返回 null */
async function generateInsightContent(
  anthropic: Anthropic,
  lang: "zh" | "en",
  dataPack: Record<string, unknown>
): Promise<string | null> {
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
  if (!second || isBannedInsight(second)) return null;
  return second;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
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
  if (cached?.content) return cached.content;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const [score, trend] = await Promise.all([
    getNumberScore(number, urlOperators),
    getScoreTrend(number, 14),
  ]);
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
    const clean = await generateInsightContent(anthropic, lang, dataPack);
    if (!clean) return null;

    await supabase.from("ai_insights").upsert(
      { number, insight_date: today, lang, scope, content: clean },
      { onConflict: "number,insight_date,lang,scope" }
    );
    return clean;
  } catch (e) {
    console.error("AI insight error:", e);
    return null;
  }
}