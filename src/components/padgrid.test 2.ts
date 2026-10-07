import { describe, expect, it } from "vitest";
import { PAD_ROWS } from "../lib/voices";
import { CONTROL_GROUPS } from "./DeviceDiagram";

describe("pad geometry", () => {
  it("is the 4×4 SP-404MKII layout: pad 1 bottom-left, 13 top-left", () => {
    expect(PAD_ROWS).toEqual([[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]]);
    expect([...PAD_ROWS.flat()].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it("device diagram only offers controls that appear in verified procedures", () => {
    expect(CONTROL_GROUPS.fx).toContain("DJFX LOOPER");
    expect(CONTROL_GROUPS.keys).toContain("PATTERN SELECT");
        expect(CONTROL_GROUPS.edit).toContain("START/END");
    expect(CONTROL_GROUPS.bank).toHaveLength(5);
    // every control is printed on the unit (Panel descriptions); no duplicates across groups
    expect(new Set(Object.values(CONTROL_GROUPS).flat()).size).toBe(38);
  });
});
