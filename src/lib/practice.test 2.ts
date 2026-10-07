import { describe, expect, it } from "vitest";
import { hiddenFraction, judge, keyToPad, padOfVoice, padToKey, rowText, stepAtTime, updateStat, visibleSteps, type Hit } from "./practice";

describe("pattern as text", () => {
  it("draws 16 steps grouped by beat", () => {
    expect(rowText([1, 9])).toBe("1--- ---- 1--- ----");
    expect(rowText([5, 13])).toBe("---- 1--- ---- 1---");
    expect(rowText([])).toBe("---- ---- ---- ----");
    expect(rowText([1, 3, 5, 7, 9, 11, 13, 15])).toBe("1-1- 1-1- 1-1- 1-1-");
  });
});

describe("visibility modes", () => {
  it("SHOW ALL never hides; HIDE STEPS hides only while playing; MEMORY hides more each round", () => {
    for (const p of ["listen", "watch", "copy", "play"] as const) expect(hiddenFraction("show", p, 3)).toBe(0);
    expect([hiddenFraction("hide", "copy", 0), hiddenFraction("hide", "play", 0)]).toEqual([0, 1]);
    expect([0, 1, 2, 5].map((r) => hiddenFraction("memory", "play", r))).toEqual([0.5, 0.75, 1, 1]);
    expect(hiddenFraction("memory", "copy", 2)).toBe(0);
  });
  it("hides the last steps in time order, deterministically", () => {
    expect(visibleSteps([13, 5, 1, 9], 0.5)).toEqual([1, 5]);
    expect(visibleSteps([13, 5, 1, 9], 0.75)).toEqual([1]);
    expect(visibleSteps([13, 5, 1, 9], 1)).toEqual([]);
    expect(visibleSteps([1, 5, 9], 0)).toEqual([1, 5, 9]);
  });
});

describe("time → step", () => {
  const t0 = 10, d = 0.1;
  it("finds the nearest step with a signed offset and the bar", () => {
    expect(stepAtTime(10.0, t0, d)).toMatchObject({ step: 1, bar: 0, offset: 0 });
    expect(stepAtTime(10.42, t0, d)).toMatchObject({ step: 5, bar: 0 });
    expect(stepAtTime(10.42, t0, d).offset).toBeCloseTo(0.2, 5);
    expect(stepAtTime(11.6, t0, d)).toMatchObject({ step: 1, bar: 1 });
    expect(stepAtTime(9.97, t0, d).offset).toBeCloseTo(-0.3, 5);
  });
});

describe("judging", () => {
  const voices = { KICK: [1, 9], SNARE: [5, 13] };
  const h = (voice: string, step: number, offset = 0, bar = 0): Hit => ({ voice, step, offset, bar });
  it("a perfect bar passes with score 1", () => {
    const j = judge(voices, [h("KICK", 1), h("SNARE", 5), h("KICK", 9), h("SNARE", 13)], 1, 100);
    expect(j).toMatchObject({ expected: 4, matched: 4, extra: 0, score: 1, passed: true });
  });
  it("misses, extras and timing are reported separately", () => {
    const j = judge(voices, [h("KICK", 1, 0.1), h("SNARE", 5, 0.3), h("KICK", 10)], 1, 100);
    expect(j.matched).toBe(2); expect(j.extra).toBe(1); expect(j.passed).toBe(false);
    expect(j.missed.map((m) => `${m.voice}${m.step}`).sort()).toEqual(["KICK9", "SNARE13"]);
    expect(j.meanOffsetMs).toBeCloseTo(20, 5);              // (0.1 + 0.3)/2 steps × 100 ms
  });
  it("taps outside the tolerance or on the wrong voice don't count; each note matches once per bar", () => {
    const j = judge({ KICK: [1] }, [h("KICK", 1, 0.5), h("SNARE", 1), h("KICK", 1, 0.0), h("KICK", 1, 0.0)], 1, 100);
    expect(j.matched).toBe(1); expect(j.extra).toBe(3);
  });
  it("scores several bars independently", () => {
    const j = judge({ KICK: [1] }, [h("KICK", 1, 0, 0), h("KICK", 1, 0, 1)], 2, 100);
    expect(j).toMatchObject({ expected: 2, matched: 2, passed: true });
    expect(judge({ KICK: [1] }, [h("KICK", 1, 0, 0)], 2, 100).passed).toBe(false);
  });
  it("an empty pattern is never a pass", () => expect(judge({}, [], 1, 100).passed).toBe(false));
});

describe("keyboard and pad layout", () => {
  it("mirrors the unit: bottom row = pads 1–4, top row = pads 13–16", () => {
    expect([keyToPad("z"), keyToPad("x"), keyToPad("c"), keyToPad("v")]).toEqual([1, 2, 3, 4]);
    expect([keyToPad("1"), keyToPad("2"), keyToPad("3"), keyToPad("4")]).toEqual([13, 14, 15, 16]);
    expect(keyToPad("A")).toBe(5);
    expect(keyToPad("m")).toBeNull();
    for (let p = 1; p <= 16; p++) expect(keyToPad(padToKey(p))).toBe(p);
  });
  it("finds the pad of a voice in the default kit", () => {
    expect(padOfVoice("KICK")).toBe(1);
    expect(padOfVoice("SNARE")).toBe(2);
    expect(padOfVoice("NOPE")).toBeNull();
  });
});

describe("practice stats", () => {
  it("keeps the best score and counts runs and passes", () => {
    const a = updateStat(undefined, { score: 0.6, passed: false }, 1);
    const b = updateStat(a, { score: 0.9, passed: true }, 2);
    expect(b).toEqual({ best: 0.9, runs: 2, passed: 1, last: 2 });
    expect(updateStat(b, { score: 0.5, passed: false }, 3).best).toBe(0.9);
  });
});
