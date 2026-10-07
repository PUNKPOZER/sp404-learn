import { describe, expect, it } from "vitest";
import { projectKind } from "./actions";

describe("one open pipeline: project file kinds", () => {
  it("routes .spsystem to the SP SYSTEM reader and .sp404learn to the legacy reader (case-insensitive)", () => {
    expect(projectKind("/Users/me/Documents/SP404 DROP/Projects/Jungle — break.spsystem")).toBe("spsystem");
    expect(projectKind("/x/Track.SPSYSTEM")).toBe("spsystem");
    expect(projectKind("C:\\music\\a.sp404learn")).toBe("sp404learn");
  });
  it("rejects everything else", () => {
    for (const p of ["/x/track.wav", "/x/notes.spsystem.txt", "/x/noext", ""]) expect(projectKind(p)).toBeNull();
  });
});
