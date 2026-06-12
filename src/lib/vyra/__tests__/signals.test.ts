import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VYRA_SIGNAL_CONFIG } from "@/lib/vyra/config";
import {
  buildBriefData,
  detectDigitSurge,
  detectMirrorSync,
  detectOverdue,
  detectScoreJump,
  diversifyFreeTierTop2,
} from "@/lib/vyra/signals";
import type { VyraDetectInput, VyraDrawRow, VyraSignal } from "@/lib/vyra/types";

const DATE = "2026-06-10";
const REGION = "west" as const;

function draw(
  draw_date: string,
  prizes: string[],
  operator = "magnum"
): VyraDrawRow {
  return {
    draw_date,
    operator,
    first_prize: prizes[0] ?? null,
    second_prize: prizes[1] ?? null,
    third_prize: prizes[2] ?? null,
    special_numbers: prizes.slice(3),
    consolation_numbers: [],
  };
}

/** Uniform tail digits 0-9 across history — recent matches baseline → no surge. */
function quietDigitInput(): VyraDetectInput {
  const history: VyraDrawRow[] = [];
  for (let i = 0; i < 30; i++) {
    const d = `2026-05-${String(i + 1).padStart(2, "0")}`;
    history.push(draw(d, [`${i % 10}000`, `${(i + 1) % 10}111`, `${(i + 2) % 10}222`]));
  }
  const recent = history.slice(-7);
  return {
    drawsRecent: recent,
    drawsHistory: history,
    scores: [],
    snapshotsToday: [],
    snapshotsWeekAgo: [],
  };
}

/** Recent window all tail-8 — should trigger digit_surge. */
function surgeDigitInput(): VyraDetectInput {
  const history: VyraDrawRow[] = [];
  for (let i = 0; i < 40; i++) {
    const d = `2026-04-${String((i % 28) + 1).padStart(2, "0")}`;
    history.push(draw(d, [`${i % 10}001`, `${(i + 1) % 10}002`, `${(i + 2) % 10}003`]));
  }
  const recent: VyraDrawRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = `2026-06-${String(i + 1).padStart(2, "0")}`;
    recent.push(draw(d, ["1088", "2088", "3088", "4088", "5088"]));
    history.push(recent[recent.length - 1]);
  }
  return {
    drawsRecent: recent,
    drawsHistory: history,
    scores: [],
    snapshotsToday: [],
    snapshotsWeekAgo: [],
  };
}

describe("detectDigitSurge", () => {
  it("does not trigger when recent matches historical baseline", () => {
    const signals = detectDigitSurge(REGION, DATE, quietDigitInput());
    assert.equal(signals.length, 0);
  });

  it("triggers when tail digit z exceeds threshold", () => {
    const signals = detectDigitSurge(REGION, DATE, surgeDigitInput());
    assert.ok(signals.length > 0);
    assert.ok(signals.some((s) => s.type === "digit_surge" && s.data.digitType === "tail"));
    assert.ok(signals.some((s) => Number(s.data.digit) === 8));
  });
});

describe("detectOverdue", () => {
  it("does not trigger when gap ratio below minimum", () => {
    const input: VyraDetectInput = {
      ...quietDigitInput(),
      scores: [
        {
          number: "1234",
          scope: "damacai+magnum+toto",
          total_hits: 10,
          current_gap_days: 50,
          avg_gap_days: 40,
        },
      ],
    };
    assert.equal(detectOverdue(REGION, DATE, input).length, 0);
  });

  it("triggers top overdue by gap ratio", () => {
    const input: VyraDetectInput = {
      ...quietDigitInput(),
      scores: [
        {
          number: "5678",
          scope: "damacai+magnum+toto",
          total_hits: 8,
          current_gap_days: 200,
          avg_gap_days: 50,
        },
        {
          number: "9999",
          scope: "damacai+magnum+toto",
          total_hits: 3,
          current_gap_days: 300,
          avg_gap_days: 50,
        },
      ],
    };
    const signals = detectOverdue(REGION, DATE, input);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].numbers[0], "5678");
    assert.equal(signals[0].data.ratio, 4);
  });
});

describe("detectScoreJump", () => {
  it("does not trigger when delta below threshold", () => {
    const input: VyraDetectInput = {
      ...quietDigitInput(),
      snapshotsToday: [{ snapshot_date: DATE, number: "1234", overall_score: 55 }],
      snapshotsWeekAgo: [{ snapshot_date: "2026-06-03", number: "1234", overall_score: 50 }],
    };
    assert.equal(detectScoreJump(DATE, input).length, 0);
  });

  it("triggers when |delta| >= jumpThreshold", () => {
    const input: VyraDetectInput = {
      ...quietDigitInput(),
      snapshotsToday: [{ snapshot_date: DATE, number: "8888", overall_score: 70 }],
      snapshotsWeekAgo: [{ snapshot_date: "2026-06-03", number: "8888", overall_score: 50 }],
    };
    const signals = detectScoreJump(DATE, input);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].data.delta, 20);
    assert.equal(signals[0].data.scope, "all");
  });
});

describe("detectMirrorSync", () => {
  it("does not trigger without mirror pairs in window", () => {
    const input: VyraDetectInput = {
      ...quietDigitInput(),
      drawsRecent: [draw("2026-06-10", ["1234", "5678"])],
    };
    assert.equal(detectMirrorSync(REGION, DATE, input).length, 0);
  });

  it("triggers when X and mirror(X) both drawn", () => {
    const input: VyraDetectInput = {
      ...quietDigitInput(),
      drawsRecent: [draw("2026-06-10", ["1234", "4321", "5678"])],
    };
    const signals = detectMirrorSync(REGION, DATE, input);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].type, "mirror_sync");
    assert.ok(signals[0].numbers.includes("1234"));
    assert.ok(signals[0].numbers.includes("4321"));
  });
});

describe("buildBriefData", () => {
  it("sorts by surprise desc and truncates to maxSignalsPerBrief", () => {
    const input: VyraDetectInput = {
      ...surgeDigitInput(),
      scores: [
        {
          number: "5678",
          scope: "damacai+magnum+toto",
          total_hits: 10,
          current_gap_days: 250,
          avg_gap_days: 50,
        },
      ],
      snapshotsToday: [
        { snapshot_date: DATE, number: "1111", overall_score: 80 },
        { snapshot_date: DATE, number: "2222", overall_score: 75 },
      ],
      snapshotsWeekAgo: [
        { snapshot_date: "2026-06-03", number: "1111", overall_score: 50 },
        { snapshot_date: "2026-06-03", number: "2222", overall_score: 50 },
      ],
      drawsRecent: [
        ...surgeDigitInput().drawsRecent,
        draw("2026-06-10", ["1234", "4321"]),
      ],
    };

    const brief = buildBriefData(REGION, DATE, input, {
      ...VYRA_SIGNAL_CONFIG,
      maxSignalsPerBrief: 3,
    });

    assert.equal(brief.region, REGION);
    assert.equal(brief.date, DATE);
    assert.ok(brief.signals.length <= 3);
    assert.equal(brief.quiet, false);
    if (brief.signals.length >= 2) {
      assert.notEqual(brief.signals[0].type, brief.signals[1].type);
    }
    const locked = brief.signals.slice(2);
    for (let i = 1; i < locked.length; i++) {
      assert.ok(locked[i - 1].surprise >= locked[i].surprise);
    }
  });

  it("diversifies free-tier top 2 signal types", () => {
    const sorted: VyraSignal[] = [
      { type: "digit_surge", surprise: 1, numbers: ["1000"], data: {} },
      { type: "digit_surge", surprise: 0.9, numbers: ["2000"], data: {} },
      { type: "overdue", surprise: 0.8, numbers: ["5678"], data: {} },
      { type: "score_jump", surprise: 0.7, numbers: ["8888"], data: {} },
    ];
    const out = diversifyFreeTierTop2(sorted);
    assert.equal(out[0].type, "digit_surge");
    assert.equal(out[1].type, "overdue");
    assert.equal(out[2].type, "digit_surge");
    assert.equal(out[3].type, "score_jump");
  });

  it("marks quiet when no signals", () => {
    const brief = buildBriefData(REGION, DATE, quietDigitInput());
    assert.equal(brief.quiet, true);
    assert.equal(brief.signals.length, 0);
  });
});
