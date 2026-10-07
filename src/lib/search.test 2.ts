import { describe, expect, it } from "vitest";
import { groupResults, search, stem } from "./search";
import { GENRE_PICKS, recommend } from "./recommend";
import { byId } from "../content/load";

describe("search", () => {
  it("stems inflections", () => { expect(stem("resampling")).toBe(stem("resample")); });
  for (const q of ["resample", "vocal chop", "jungle", "DJFX", "bass", "ресэмпл", "нарезка", "бас"]) {
    it(`finds results for "${q}"`, () => { expect(search(q).length, q).toBeGreaterThan(0); });
  }
  it("mixes types", () => { expect(groupResults(search("bass")).length).toBeGreaterThan(1); });
  it("empty query gives nothing", () => { expect(search("  ")).toEqual([]); });
});
describe("recommend", () => {
  it("all curated ids exist", () => {
    for (const [g, ids] of Object.entries(GENRE_PICKS)) for (const id of ids) expect(byId(id), `${g}:${id}`).toBeTruthy();
  });
  it("changes with genre", () => {
    const a = recommend("uk_garage").map((r) => r.id), b = recommend("techno").map((r) => r.id);
    expect(a).not.toEqual(b);
  });
  it("finished lessons sink", () => {
    const first = recommend("uk_garage")[0].id;
    expect(recommend("uk_garage", { [first]: 1 }).at(-1)!.id).toBe(first);
  });
});
