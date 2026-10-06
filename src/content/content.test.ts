import { describe, expect, it } from "vitest";
import { FX } from "./fx";
import { TRICKS, PLANNED_TOPICS } from "./tricks";
import { REFERENCE, searchReference } from "./reference";
import { verified, type Source } from "./types";
import { stepsFromContent } from "./toSteps";
import { KNOWN_CONTROLS } from "./validate";
import { PLANNED } from "./load";

const roland = (s: Source) => /^https:\/\/(static|articles)\.roland\.com\//.test(s.url);

describe("verified-only content rule", () => {
  const all = [...FX, ...TRICKS, ...REFERENCE];
  it("every verified item has at least one Roland source with a check date", () => {
    for (const item of verified(all)) {
      if (!item.sources.length) { expect("steps" in item ? item.steps.some((st) => st.controls?.length) : false, `${item.id}: unsourced items must be concept-only`).toBe(false); continue; }
      for (const s of item.sources) { expect(roland(s), `${item.id}: ${s.url}`).toBe(true); expect(s.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
    }
  });
  it("unverified (needs_review / planned) items never reach the production lists", () => {
    expect([...FX, ...TRICKS, ...REFERENCE].every((x) => x.status === "verified")).toBe(true);
    expect(PLANNED_TOPICS.length).toBeGreaterThan(5);
    expect(PLANNED.fx.length).toBeGreaterThan(0);
  });
  it("verified items are complete", () => {
    for (const f of verified(FX)) { expect(f.params.length, f.id).toBeGreaterThan(0); expect(f.tryThis.length, f.id).toBeGreaterThan(1); expect(f.useFor.length, f.id).toBeGreaterThan(0); }
    for (const t of verified(TRICKS)) expect(t.steps.length, t.id).toBeGreaterThan(1);
  });
  it("no invented button names: controls used are known SP-404MK2 controls", () => {
    const known = KNOWN_CONTROLS;
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
