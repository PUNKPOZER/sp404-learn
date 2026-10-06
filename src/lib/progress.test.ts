import { beforeEach, describe, expect, it } from "vitest";
import { latest, loadProgress, percent, resetProgress, saveProgress } from "./progress";

beforeEach(() => { for (const k of Object.keys(loadProgress())) resetProgress(k); });

describe("lesson progress", () => {
  const base = { courseId: "footwork", total: 40, lesson: 3, lessons: 18, lessonTitle: "Клэп" };
  it("tracks the furthest step and never moves the percentage backwards", () => {
    saveProgress({ ...base, index: 9 }, 1);
    saveProgress({ ...base, index: 4 }, 2);               // user went back
    const p = loadProgress().footwork;
    expect(p.index).toBe(4);
    expect(p.furthest).toBe(9);
    expect(percent(p)).toBe(25);                           // (9+1)/40
  });
  it("picks the most recently updated course for CONTINUE", () => {
    saveProgress({ ...base, courseId: "a", index: 1 }, 10);
    saveProgress({ ...base, courseId: "b", index: 1 }, 20);
    expect(latest(loadProgress())?.courseId).toBe("b");
    expect(latest({})).toBeNull();
  });
  it("reset removes only that course; percent is capped and safe", () => {
    saveProgress({ ...base, courseId: "a", index: 1 }); saveProgress({ ...base, courseId: "b", index: 1 });
    resetProgress("a");
    expect(Object.keys(loadProgress())).toEqual(["b"]);
    expect(percent({ furthest: 99, total: 10 })).toBe(100);
    expect(percent({ furthest: 0, total: 0 })).toBe(0);
  });
});
