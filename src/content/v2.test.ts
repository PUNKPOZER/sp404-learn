import { beforeEach, describe, expect, it } from "vitest";
import { ITEMS, byId, fxEntries, isPublishable, itemsOf, loc, referenceEntries, trickEntries } from "./load";
import { stepsFromLessonSteps } from "./toSteps";
import { validateAll, validateItem } from "./validate";
import type { ContentItem, FxEntryV2, Lesson, Trick } from "./schema";
import { coursePercent, isDone, loadDone, markDone, unmarkDone } from "../lib/progress";

const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: "t-lesson", type: "lesson", title: { ru: "Урок", en: "Lesson" }, summary: { ru: "Кратко", en: "Short" }, category: "basics", tags: [],
  difficulty: "beginner", durationMin: 5, verification: { status: "needs_review" }, objectives: [{ ru: "Цель", en: "Goal" }],
  steps: [{ kind: "concept", text: { ru: "Шаг", en: "Step" }, tryIt: { ru: "Попробуй", en: "Try it" } }], ...over,
});

describe("shipped content (data files under /content)", () => {
  it("loads every item and passes all content rules", () => {
    expect(ITEMS.length).toBeGreaterThan(30);
    expect(validateAll(ITEMS)).toEqual([]);
  });
  it("legacy FX / TRICKS / REFERENCE survive the move to data (ids, counts, bilingual)", () => {
    expect(fxEntries().map((f) => f.id).sort()).toEqual(["djfx-looper", "filter-drive", "isolator", "resonator"]);
    expect(trickEntries().map((t) => t.id).sort()).toEqual(["mute-group", "pattern-chain", "resample-pattern", "skip-back", "tr-rec"]);
    expect(referenceEntries().length).toBe(itemsOf("reference").length);
    for (const i of ITEMS) { expect(i.title.ru && i.title.en).toBeTruthy(); }
  });
  it("only verified items are publishable", () => {
    expect(ITEMS.every((i) => isPublishable(i.verification))).toBe(true);   // today everything shipped is verified; needs_review would be filtered
    expect(isPublishable({ status: "needs_review" })).toBe(false);
  });
  it("loc() falls back to Russian when an English string is empty", () => {
    expect(loc({ ru: "а", en: "" })).toBe("а");
  });
  it("reference entries link to existing FX / trick items", () => {
    for (const r of itemsOf<import("./schema").ReferenceV2>("reference")) if (r.see) expect(byId(r.see.id)?.type, r.id).toBe(r.see.type);
  });
});

describe("validator rules (each rule has a failing example)", () => {
  const all: ContentItem[] = [lesson()];
  it("accepts a well-formed lesson", () => expect(validateItem(lesson(), all)).toEqual([]));
  it("requires ru AND en everywhere", () => {
    expect(validateItem(lesson({ title: { ru: "Урок", en: "" } }), all).join()).toMatch(/ru and en/);
  });
  it("requires verification evidence for verified items (Roland URL + date)", () => {
    expect(validateItem(lesson({ verification: { status: "verified" } }), all).join()).toMatch(/verifiedAgainst/);
    expect(validateItem(lesson({ verification: { status: "verified", verifiedAgainst: [{ title: "x", url: "https://example.com/a" }], verifiedOn: "2026-10-07" } }), all).join()).toMatch(/not a Roland/);
    expect(validateItem(lesson({ verification: { status: "verified", verifiedAgainst: [{ title: "x", url: "https://static.roland.com/a" }], verifiedOn: "2026-10-07" } }), all)).toEqual([]);
  });
  it("blocks hardware steps in items that are not verified", () => {
    const l = lesson({ steps: [{ kind: "hardware", text: { ru: "Нажми [REC]", en: "Press [REC]" }, tryIt: { ru: "а", en: "a" } }] });
    expect(validateItem(l, [l]).join()).toMatch(/not verified/);
  });
  it("rejects invented controls and bad pads", () => {
    const l = lesson({ verification: { status: "verified", verifiedAgainst: [{ title: "x", url: "https://static.roland.com/a" }], verifiedOn: "2026-10-07" },
      steps: [{ kind: "hardware", text: { ru: "а", en: "a" }, deviceHighlight: { controls: ["TURBO BUTTON"], pads: [17] }, tryIt: { ru: "а", en: "a" } }] });
    const p = validateItem(l, [l]).join();
    expect(p).toMatch(/unknown control "TURBO BUTTON"/); expect(p).toMatch(/pad 17/);
  });
  it("limits step length and needs objectives, steps and a tryIt", () => {
    const long = "я".repeat(300);
    expect(validateItem(lesson({ steps: [{ kind: "concept", text: { ru: long, en: "ok" }, tryIt: { ru: "а", en: "a" } }] }), all).join()).toMatch(/longer than/);
    expect(validateItem(lesson({ objectives: [] }), all).join()).toMatch(/objectives/);
    expect(validateItem(lesson({ steps: [{ kind: "concept", text: { ru: "а", en: "a" } }] }), all).join()).toMatch(/tryIt/);
  });
  it("checks relations, duplicate ids and prerequisite cycles", () => {
    expect(validateItem(lesson({ related: ["nope"] }), all).join()).toMatch(/unknown relation/);
    const a = lesson({ id: "a", prerequisites: ["b"] }), b = lesson({ id: "b", prerequisites: ["a"] });
    expect(validateAll([a, b]).join()).toMatch(/cycle/);
    expect(validateAll([lesson(), lesson()]).join()).toMatch(/duplicate id/);
  });
});

describe("Lesson → shared TutorialStep", () => {
  it("keeps highlights, pattern, why / try-it / parameter and the hardware-vs-concept kind", () => {
    const steps = stepsFromLessonSteps("S", [
      { kind: "hardware", text: { ru: "Нажми [REC]. Дальше.", en: "Press [REC]. Then." }, deviceHighlight: { controls: ["REC"], pads: [3] }, why: { ru: "потому", en: "because" }, tryIt: { ru: "сделай", en: "do it" } },
      { kind: "concept", text: { ru: "Идея", en: "Idea" }, stepPattern: { voices: { KICK: [1, 5] } }, parameterExample: { control: "CTRL 1", setting: "max", effect: { ru: "громко", en: "loud" } } },
    ]);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ id: 0, total: 2, section: "S", controls: ["REC"], pads: [3], kind: "hardware", why: "потому", tryIt: "сделай", title: "Нажми REC." });
    expect(steps[1]).toMatchObject({ kind: "concept", grid: { KICK: [1, 5] }, parameter: { control: "CTRL 1", setting: "max", effect: "громко" } });
  });
  it("every shipped trick converts to steps with valid highlight data", () => {
    for (const t of itemsOf<Trick>("trick")) { const s = stepsFromLessonSteps(loc(t.title), t.steps); expect(s.length).toBe(t.steps.length); }
    for (const f of itemsOf<FxEntryV2>("fx")) expect(stepsFromLessonSteps("x", f.tryThis).length).toBe(f.tryThis.length);
  });
});

describe("per-lesson progress (separate key; course progress untouched)", () => {
  beforeEach(() => { for (const id of ["a", "b", "c"]) unmarkDone(id); });
  it("marks, unmarks and computes the course percentage", () => {
    loadDone();
    expect(coursePercent(["a", "b", "c"])).toBe(0);
    markDone("a", 1); markDone("b", 2);
    expect(isDone("a") && isDone("b") && !isDone("c")).toBe(true);
    expect(coursePercent(["a", "b", "c"])).toBe(67);
    unmarkDone("a");
    expect(isDone("a")).toBe(false);
    expect(coursePercent([])).toBe(0);
  });
});
