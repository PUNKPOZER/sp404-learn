import { describe, expect, it } from "vitest";
import appCopy from "../assets/brand-logo.svg?raw";
import reference from "../../design-reference/brand-logo.svg?raw";
import { brandPathData, REGISTERED_SUBPATHS } from "../components/BrandMark";

const genres = import.meta.glob("../assets/genres/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("brand symbol", () => {
  it("the app copy is byte-identical to the supplied reference (never redrawn)", () => {
    expect(appCopy).toBe(reference);
  });
  it("is a single path with the 947×1072 viewBox", () => {
    expect(reference.match(/<path /g)).toHaveLength(1);
    expect(reference).toContain('viewBox="0 0 947 1072"');
  });
});

describe("® removal", () => {
  const starts = (d: string) => d.split(/(?=M)/).map((s) => s.slice(1).split(/[CLHZ]/)[0].trim().split(/[ ,]/).map(Number));
  it("the logo has 8 subpaths and the last four are the ® (left of the cow, lower-left of the canvas)", () => {
    const all = starts(brandPathData(reference, true));
    expect(all).toHaveLength(8);
    for (const [x, y] of all.slice(-REGISTERED_SUBPATHS)) { expect(x).toBeLessThan(200); expect(y).toBeGreaterThan(440); expect(y).toBeLessThan(500); }
    for (const [x, y] of all.slice(0, 8 - REGISTERED_SUBPATHS)) expect(x < 200 && y > 440 && y < 500).toBe(false);
  });
  it("rendered path keeps the first four subpaths byte-for-byte", () => {
    const full = brandPathData(reference, true), cut = brandPathData(reference);
    expect(full.startsWith(cut)).toBe(true);
    expect(cut.split(/(?=M)/)).toHaveLength(8 - REGISTERED_SUBPATHS);
  });
});

describe("genre SVG assets", () => {
  const ids = ["footwork", "jungle", "ukgarage", "hiphop", "house", "techno", "breakbeat", "ambient", "triphop", "lofihouse", "lofihiphop", "idm", "dub"];
  it("all expected genre files exist", () => {
    expect(Object.keys(genres).map((p) => p.split("/").pop()!.replace(".svg", "")).sort()).toEqual([...ids].sort());
  });
  it.each(ids)("%s is editable vector art on the shared 200×200 canvas, no bitmaps/gradients/filters", (id) => {
    const svg = genres[`../assets/genres/${id}.svg`];
    expect(svg).toContain('viewBox="0 0 200 200"');
    expect(svg).not.toMatch(/<image|base64|Gradient|<filter|<pattern/i);
    expect(svg).toMatch(/currentColor/);
  });
});
