/** Static section captions — facts only, no prediction framing. */

import type { NumberReportData } from "@/lib/vyra/report";

const OP_LABEL: Record<string, string> = {
  magnum: "Magnum",
  damacai: "Damacai",
  toto: "Toto",
  cashsweep: "Cash Sweep",
  sabah88: "Sabah 88",
  stc: "STC",
  singapore: "Singapore",
};

export function sectionCaption(
  section: 1 | 2 | 3 | 4 | 5 | 6,
  data: NumberReportData,
  lang: "zh" | "en" = "zh"
): string {
  if (lang === "en") return sectionCaptionEn(section, data);

  switch (section) {
    case 1: {
      const peak = [...data.yearHeatmap].sort((a, b) => b.hits - a.hits)[0];
      const total = data.yearHeatmap.reduce((s, y) => s + y.hits, 0);
      return peak && peak.hits > 0
        ? `${data.number} 过去42年共开出 ${total} 次,${peak.year} 年最多(${peak.hits}次)。`
        : `${data.number} 在所载历史里尚未有开出记录。`;
    }
    case 2: {
      const top = data.operatorBreakdown[0];
      if (!top) return "暂无分运营商统计数据。";
      const avgs = data.operatorBreakdown
        .map((o) => o.avgGapDraws)
        .filter((v): v is number => v != null && v > 0);
      const spread =
        avgs.length >= 2
          ? Math.round(
              ((Math.max(...avgs) - Math.min(...avgs)) / Math.min(...avgs)) * 100
            )
          : 0;
      const lead = OP_LABEL[top.operator] ?? top.operator;
      return spread > 5
        ? `运营商拆解 · ${lead} ${top.hits} 次领先,各家平均间隔差超过 ${spread}%。`
        : `运营商拆解 · ${lead} 开出 ${top.hits} 次,为各家最多。`;
    }
    case 3: {
      const { rank, total, peers } = data.coldCohort;
      if (total === 0) return "同冷度对照 · 暂无全网间隔数据。";
      const topPeer = peers[0];
      return `同冷度对照 · 全网冷藏倍率相近的号码里排第 ${rank} 名,共 ${total} 组同群。${
        topPeer && topPeer.number !== data.number
          ? `目前最长的是 ${topPeer.number}。`
          : ""
      }`;
    }
    case 4: {
      const selfSum = data.mirrorTimeline.reduce((s, m) => s + m.self, 0);
      const mirSum = data.mirrorTimeline.reduce((s, m) => s + m.mirror, 0);
      return `镜像对照 · 近24个月 ${data.number} 开出 ${selfSum} 次,镜像 ${data.mirrorNumber} 开出 ${mirSum} 次。`;
    }
    case 5: {
      const p = data.preHitPattern;
      if (p.sampleHits === 0) return "开出前形态 · 样本不足,暂无窗口统计。";
      const diff = p.preHitTailMean - p.baselineTailMean;
      const dir = diff >= 0 ? "偏高" : "偏低";
      return `开出前形态 · 近 ${p.sampleHits} 次开出前30天,尾数${data.number[3]}出现密度比全历史基线${dir}(${Math.abs(Math.round(diff * 1000) / 10)}个百分点)。`;
    }
    case 6: {
      const trend = data.scoreTrend;
      if (trend.length === 0) return "评分轨迹 · 尚无历史快照。";
      if (trend.length === 1) return `评分轨迹 · 目前记录 ${trend[0].score} 分(${trend[0].date})。`;
      const delta = trend[trend.length - 1].score - trend[0].score;
      const dir = delta >= 0 ? "升" : "降";
      return `评分轨迹 · 共 ${trend.length} 个快照点,区间${dir} ${Math.abs(delta)} 分。`;
    }
  }
}

function sectionCaptionEn(section: 1 | 2 | 3 | 4 | 5 | 6, data: NumberReportData): string {
  switch (section) {
    case 1: {
      const total = data.yearHeatmap.reduce((s, y) => s + y.hits, 0);
      return `${data.number}: ${total} hits across ${data.yearHeatmap.length} years on record.`;
    }
    case 2: {
      const top = data.operatorBreakdown[0];
      return top
        ? `Operator split — ${OP_LABEL[top.operator] ?? top.operator} leads with ${top.hits} hits.`
        : "No per-operator stats.";
    }
    case 3:
      return `Cold cohort — rank #${data.coldCohort.rank} among ${data.coldCohort.total} peers (all-operator scope).`;
    case 4:
      return `Mirror curve — ${data.number} vs ${data.mirrorNumber}, last 24 months.`;
    case 5:
      return `Pre-hit pattern — ${data.preHitPattern.sampleHits} samples, 30-day tail-digit window.`;
    case 6:
      return `Score trend — ${data.scoreTrend.length} snapshot(s) on file.`;
  }
}

/** One-line blur preview for locked sections (sections 2–6). */
export function sectionLockPreview(
  section: 2 | 3 | 4 | 5 | 6,
  data: NumberReportData
): string {
  return sectionCaption(section, data, "zh").split(" · ")[1] ?? sectionCaption(section, data, "zh");
}
