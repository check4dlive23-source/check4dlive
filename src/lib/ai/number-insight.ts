import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
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
2. 严禁预测未来开奖、严禁任何引导用户行动或暗示「该开了」的句式——
   禁用「值得+任何动词」「可以留意」「机会」「好兆头」「不妨」,
   以及「该开了」「快到了」「回归在即」「蓄势」「酝酿」等到期暗示;
   间隔超过平均只能客观陈述数字,不能赋予期待含义
3. 分数高时必须同时讲清楚分数高的原因和局限(例如刚开过所以动能高)
4. 100-150字,直接进入分析,不要问候语,不要免责声明(页面已有)
5. 纯文本输出:禁止 Markdown 符号(**、#、-列表等),禁止小标题,
   就是连贯的两三段话`;

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
   as building toward anything
3. When scores are high, also explain why and their limitation
   (e.g. momentum is high because it just came out)
4. 80-130 words, start directly, no greeting, no disclaimer
5. Plain text only: no Markdown symbols (**, #, lists), no headings,
   just two or three flowing paragraphs`;

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** 缓存优先;miss 则生成并写缓存;任何失败返回 null(前端降级模板) */
export async function getOrCreateInsight(
  number: string,
  lang: "zh" | "en"
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const today = todayISO();

  const { data: cached } = await supabase
    .from("ai_insights")
    .select("content")
    .eq("number", number)
    .eq("insight_date", today)
    .eq("lang", lang)
    .maybeSingle();
  if (cached?.content) return cached.content;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const [score, trend] = await Promise.all([
    getNumberScore(number, []),
    getScoreTrend(number, 14),
  ]);
  if (!score) return null;

  const dataPack = {
    number,
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
    max_gap_days: score.max_gap_days,
    first_seen_date: score.first_seen_date,
    last_seen_date: score.last_seen_date,
    weekly_score_change: weeklyDelta(trend),
    mirror_number: number.split("").reverse().join(""),
    operator_names: OPERATOR_LOCAL,
  };

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 350,
      system: lang === "zh" ? SYSTEM_ZH : SYSTEM_EN,
      messages: [
        {
          role: "user",
          content: `号码数据包(JSON):
${JSON.stringify(dataPack)}

字段说明:overall_score 为 0-100 综合评分(freq频率/cycle周期位置/momentum近期动能/mirror镜像活性 四维加权);weekly_score_change 为7日总分变化(null=快照天数不足);gap 单位为天;数据口径为全部运营商合并。`,
        },
      ],
    });
    const text =
      msg.content[0]?.type === "text" ? msg.content[0].text.trim() : null;
    if (!text) return null;

    const clean = text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");

    await supabase.from("ai_insights").upsert(
      { number, insight_date: today, lang, content: clean },
      { onConflict: "number,insight_date,lang" }
    );
    return clean;
  } catch (e) {
    console.error("AI insight error:", e);
    return null;
  }
}
