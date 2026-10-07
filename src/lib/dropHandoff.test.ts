import { describe, expect, it } from "vitest";
import { handOffToDrop, prepareAndHandOff, type HandoffDeps } from "./dropHandoff";

const deps = (over: Partial<HandoffDeps> = {}) => {
  const calls: { fn: string; path: string }[] = [];
  const d: HandoffDeps = {
    openInDrop: async (p) => { calls.push({ fn: "openInDrop", path: p }); },
    reveal: async (p) => { calls.push({ fn: "reveal", path: p }); },
    ...over,
  };
  return { d, calls };
};
const PATHS = ["/Users/me/Documents/SP404 DROP/Projects/Jungle — break.spsystem", "/tmp/a \"q\" $(x); `y`.spsystem", "/tmp/日本語 ✓.spsystem"];

describe("Prepare in DROP handoff", () => {
  it("opens the exact saved path in DROP and does NOT open Finder", async () => {
    for (const path of PATHS) {
      const { d, calls } = deps();
      expect(await handOffToDrop(path, d)).toEqual({ via: "drop" });
      expect(calls).toEqual([{ fn: "openInDrop", path }]);                 // byte-for-byte the same path, spaces/quotes/Unicode untouched
    }
  });
  it("falls back to Finder when DROP cannot be launched, keeping the same path", async () => {
    const { d, calls } = deps({ openInDrop: async (p) => { calls0.push(p); throw new Error("Unable to find application named 'SP404 DROP'"); } });
    const calls0: string[] = [];
    const path = PATHS[0];
    const r = await handOffToDrop(path, d);
    expect(r).toEqual({ via: "finder", reason: "Unable to find application named 'SP404 DROP'" });
    expect(calls0).toEqual([path]);
    expect(calls).toEqual([{ fn: "reveal", path }]);
  });
  it("a Finder failure is reported but is not a failed save", async () => {
    const { d } = deps({ openInDrop: async () => { throw new Error("no DROP"); }, reveal: async () => { throw new Error("no Finder"); } });
    expect(await handOffToDrop(PATHS[2], d)).toEqual({ via: "none", reason: "no DROP" });
  });
  it("launches DROP only after the save succeeded, with the path the save reported", async () => {
    const { d, calls } = deps();
    const order: string[] = [];
    const r = await prepareAndHandOff(async () => { order.push("save"); return { path: PATHS[0], revision: 7, updated: true }; },
      { openInDrop: async (p) => { order.push("open"); await d.openInDrop(p); }, reveal: d.reveal });
    expect(order).toEqual(["save", "open"]);
    expect(r.saved.revision).toBe(7);
    expect(calls).toEqual([{ fn: "openInDrop", path: PATHS[0] }]);
  });
  it("a failed or conflicting save never launches DROP (and never opens Finder)", async () => {
    const { d, calls } = deps();
    await expect(prepareAndHandOff(async () => { throw new Error("E_CONFLICT: the project was changed on disk after it was opened"); }, d)).rejects.toThrow("E_CONFLICT");
    expect(calls).toEqual([]);
  });
});
