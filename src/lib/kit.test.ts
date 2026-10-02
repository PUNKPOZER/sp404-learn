import { describe, expect, it } from "vitest";
import { padOf } from "./kit";
import { DEFAULT_KIT, PAD_ROWS } from "./voices";

describe("SP-404MKII pad layout", () => {
  it("is 4x4 in physical order with pad 1 bottom-left", () => {
    expect(PAD_ROWS).toEqual([[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]]);
    expect(PAD_ROWS.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it("maps default kit voices to pads", () => {
    expect(padOf("KICK", DEFAULT_KIT)).toBe(1);
    expect(padOf("CLOSED_HAT", DEFAULT_KIT)).toBe(4);
    expect(padOf("CHOP", DEFAULT_KIT)).toBe(9);
    expect(padOf("NOPE", DEFAULT_KIT)).toBeNull();
  });
});
