import { describe, expect, it } from "vitest";
import { FX } from "./fx";
import { TRICKS, PLANNED_TOPICS } from "./tricks";
import { REFERENCE, searchReference } from "./reference";
import { verified, type Source } from "./types";
import { stepsFromContent } from "./toSteps";

const roland = (s: Source) => /^https:\/\/(static|articles)\.roland\.com\//.test(s.url);

describe("verified-only content rule", () => {
  const all = [...FX, ...TRICKS, ...REFERENCE];
  it("every verified item has at least one Roland source with a check date", () => {
    for (const item of verified(all)) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      for (const s of item.sources) { expect(roland(s), `${item.id}: ${s.url}`).toBe(true); expect(s.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
    }
  });
  it("todo items carry no instructional content", () => {
    for (const f of FX.filter((x) => x.status === "todo")) { expect(f.tryThis).toHaveLength(0); expect(f.whatItDoes).toBe(""); }
    for (const t of TRICKS.filter((x) => x.status === "todo")) { expect(t.steps).toHaveLength(0); expect(t.summary).toBe(""); }
    expect(PLANNED_TOPICS.length).toBeGreaterThan(5);
  });
  it("verified items are complete", () => {
    for (const f of verified(FX)) { expect(f.params.length, f.id).toBeGreaterThan(0); expect(f.tryThis.length, f.id).toBeGreaterThan(1); expect(f.useFor.length, f.id).toBeGreaterThan(0); }
    for (const t of verified(TRICKS)) expect(t.steps.length, t.id).toBeGreaterThan(2);
  });
  it("no invented button names: controls used are known SP-404MK2 controls", () => {
    const known = new Set(["PATTERN SELECT", "REC", "REMAIN", "SUB PAD", "SHIFT", "HOLD", "MARK", "RESAMPLE", "DEL", "EXIT", "EXT SOURCE",
      "CTRL 1", "CTRL 2", "CTRL 3", "VALUE", "FILTER+DRIVE", "RESONATOR", "DELAY", "ISOLATOR", "DJFX LOOPER", "MFX"]);
    for (const item of [...verified(FX), ...verified(TRICKS)]) {
      const steps = "tryThis" in item ? item.tryThis : item.steps;
      for (const s of steps) for (const c of s.controls ?? []) expect(known.has(c), `${item.id}: ${c}`).toBe(true);
    }
  });
  it("reference links point at existing FX / trick items", () => {
    for (const r of verified(REFERENCE)) {
      if (!r.see) continue;
      const pool = r.see.area === "fx" ? FX : TRICKS;
      expect(pool.some((x) => x.id === r.see!.id && x.status === "verified"), `${r.id} → ${r.see.id}`).toBe(true);
    }
  });
});

describe("reference search", () => {
  it("filters by text and category, case-insensitively", () => {
    expect(searchReference(REFERENCE, "mute").length).toBeGreaterThan(0);
    expect(searchReference(REFERENCE, "MUTE").map((r) => r.id)).toEqual(searchReference(REFERENCE, "mute").map((r) => r.id));
    const eff = searchReference(REFERENCE, "", "effects");
    expect(eff.length).toBeGreaterThan(2);
    expect(eff.every((r) => r.category === "effects")).toBe(true);
    expect(searchReference(REFERENCE, "zzzz-no-such-thing")).toHaveLength(0);
  });
});

describe("content → lesson steps", () => {
  it("adapts to the shared TutorialStep shape", () => {
    const s = stepsFromContent("X", [{ text: "Нажми [REC]. Потом ещё.", controls: ["REC"] }, { text: "Второй." }]);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ id: 0, total: 2, section: "X", controls: ["REC"], pads: [], highlight: [] });
    expect(s[0].title).toBe("Нажми REC.");
  });
});
