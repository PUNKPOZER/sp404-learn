import { describe, expect, it } from "vitest";
import appCopy from "../assets/brand-logo.svg?raw";
import reference from "../../design-reference/brand-logo.svg?raw";

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

describe("genre SVG assets", () => {
  const ids = ["footwork", "jungle", "ukgarage", "hiphop", "house", "techno", "breakbeat", "ambient", "triphop", "lofihouse", "lofihiphop"];
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
