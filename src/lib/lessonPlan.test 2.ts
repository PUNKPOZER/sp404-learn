import { describe, expect, it } from "vitest";
import { bassSummary, effectiveGenre, explainTrack, levelOf, tempoFit, tempoReading } from "./explain";
import { buildLessonPlan } from "./lessonPlan";
import type { BassNote, DrumEvent, GenrePrediction, Recipe, TrackAnalysis } from "./types";

const ev = (i: number, type: string, bar: number, step: number, confidence = 0.8): DrumEvent => ({ id: `e${i}`, time: bar * 2 + step * 0.125, type, confidence, velocity: 0.8, bar, step, quantized_time: 0, timing_offset: 0 } as unknown as DrumEvent);
const bassNote = (midi: number, bar: number, confidence = 0.8): BassNote => ({ time: bar, duration: 0.3, midi, confidence, bar, step: 0 });
const base = (over: Partial<TrackAnalysis> = {}): TrackAnalysis => ({
  schema: 1, path: "/x.wav", filename: "x.wav", duration: 120, sample_rate: 44100, channels: 2, audio_hash: "h", grid: { bpm: 160, origin: 0, beats_per_bar: 4, candidates: [80, 320], confidence: 0.5 },
  events: [ev(1, "KICK", 0, 0), ev(2, "SNARE", 0, 4), ev(3, "KICK", 1, 0), ev(4, "SNARE", 1, 4), ev(5, "CLOSED_HAT", 1, 2)], sections: [{ label: "ИНТРО", start: 0, end: 24, start_bar: 0, end_bar: 10, cluster: "A", energy: 1 }, { label: "ДРОП", start: 24, end: 60, start_bar: 10, end_bar: 25, cluster: "B", energy: 2 }],
  bass: [bassNote(29, 0), bassNote(29, 1), bassNote(31, 2)], characteristics: { syncopation: 0.7, four_on_floor: 0.3, kick_density: 5, snare_density: 4, hat_density: 2, perc_density: 1, timing_variation_ms: 22, kick_on_one: 0.1, snare_on_backbeat: 0.1, bpm: 160 },
  likely_styles: [], warnings: [], stages: [], resolution: 16, stems: {}, stems_model: "", ...over,
} as unknown as TrackAnalysis);
const pred = (genre: string, status: GenrePrediction["status"] = "confident", conf = 0.8): GenrePrediction => ({ available: true, primaryGenre: genre, primaryConfidence: conf, status, candidates: [{ genre, confidence: conf }, { genre: "jungle", confidence: 0.1 }], evidence: [] });
const recipe = { title: "r", bpm: 160, kit: {}, patterns: [{ name: "A", bars: 1, steps: { KICK: [1, 5], SNARE: [5, 13], CLOSED_HAT: [3] } }], arrangement: [], tutorialSteps: [], notes: [] } as unknown as Recipe;

describe("confidence bands and tempo reading", () => {
  it("bands: high ≥ 0.75, medium ≥ 0.5, else low", () => { expect([0.9, 0.75, 0.6, 0.5, 0.3].map(levelOf)).toEqual(["high", "high", "medium", "medium", "low"]); });
  it("tempo fits the genre's typical range and flags a better half/double reading", () => {
    expect(tempoFit("footwork", 160)).toBeGreaterThan(0.95);
    expect(tempoFit("footwork", 80)).toBeLessThan(0.01);
    expect(tempoReading(160, "footwork")).toMatchObject({ level: "high" });
    expect(tempoReading(80, "footwork")).toMatchObject({ level: "low", alt: 160, reason: "other-fits" });
    expect(tempoReading(130, null)).toEqual({ level: "medium" });
    expect(tempoReading(70, "ambient").level).toBe("medium");          // tempo-agnostic genre: no opinion
  });
});

describe("effective genre", () => {
  it("the user's choice wins; a confident model prediction is used; hybrid / missing give no genre", () => {
    expect(effectiveGenre(base({ genre: pred("house"), genre_user: "techno" }))).toMatchObject({ id: "techno", source: "user" });
    expect(effectiveGenre(base({ genre: pred("house") }))).toMatchObject({ id: "house", source: "model", status: "confident" });
    expect(effectiveGenre(base({ genre: pred("house", "hybrid", 0.4) }))).toMatchObject({ id: null, status: "hybrid" });
    expect(effectiveGenre(base())).toMatchObject({ id: null, status: "none" });
  });
});

describe("explanations", () => {
  it("tempo card suggests the better reading, bass card names the notes, structure lists the sections", () => {
    const cards = explainTrack(base({ genre: pred("footwork"), grid: { bpm: 80, origin: 0, beats_per_bar: 4, candidates: [160], confidence: 0.4 } as never }));
    const tempo = cards.find((c) => c.id === "tempo")!;
    expect(tempo.level).toBe("low"); expect(tempo.altBpm).toBe(160);
    const bass = cards.find((c) => c.id === "bass")!;
    expect(bass.headline).toContain("3"); expect(bass.body).toContain("F1");
    expect(cards.find((c) => c.id === "structure")!.details.length).toBeGreaterThan(2);
  });
  it("drum-pattern descriptors are NOT turned into advice (syncopation / four-on-the-floor stay out of the headline and body)", () => {
    const c = explainTrack(base()).find((x) => x.id === "drums")!;
    expect(`${c.headline} ${c.body} ${c.tryThis}`.toLowerCase()).not.toMatch(/синкоп|syncopat|four on the floor|четыре в пол/);
    expect(c.details.some(([, v]) => /syncopation|синкоп/i.test(v))).toBe(true);        // honestly noted under details
  });
  it("low-confidence drums are labelled approximate; no stems → no vocal card; unknown style says so", () => {
    const a = base({ events: [ev(1, "KICK", 0, 0, 0.35), ev(2, "SNARE", 0, 4, 0.4)] });
    const cards = explainTrack(a);
    expect(cards.find((c) => c.id === "drums")!.level).toBe("low");
    expect(cards.find((c) => c.id === "vocals")).toBeUndefined();
    expect(cards.find((c) => c.id === "style")!.level).toBe("low");
  });
  it("bass summary ignores notes below the confidence floor", () => {
    expect(bassSummary([bassNote(29, 0, 0.1), bassNote(31, 1, 0.9)]).count).toBe(1);
  });
});

describe("lesson plan", () => {
  it("has the seven steps in order and recommends the genre's own lessons first", () => {
    const p = buildLessonPlan(base({ genre: pred("house") }), recipe);
    expect(p.steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(p.genre).toBe("house");
    expect(p.steps[0].items.map((i) => i.id)).toContain("hs-02-drums");
    expect(p.steps[0].items[0]).toMatchObject({ type: "track" });
    expect(p.steps[0].items.map((i) => i.id)).toContain("zero-11-tr-rec");              // generic fallback after the genre lesson
    expect(p.steps[5].items.some((i) => i.type === "fx")).toBe(true);
  });
  it("break-family genres get the break-variation step and break chopping", () => {
    const p = buildLessonPlan(base({ genre: pred("jungle") }), recipe);
    expect(p.steps[1].title.toLowerCase()).toMatch(/break|брейк/);
    expect(p.steps[1].items.map((i) => i.id)).toContain("inter-11-break-chopping");
  });
  it("an unclear genre gives general advice and says so; no genre lessons are invented", () => {
    const p = buildLessonPlan(base({ genre: pred("house", "hybrid", 0.4) }), recipe);
    expect(p.genre).toBeNull();
    expect(p.steps.flatMap((s) => s.items).every((i) => !i.id.startsWith("hs-"))).toBe(true);
    expect(p.notes.join(" ")).toMatch(/unclear|неясен/);
    expect(p.steps[1].caution).toBeTruthy();
  });
  it("low confidence never becomes a command: cautions appear, and missing bass is stated", () => {
    const a = base({ genre: pred("techno"), events: [ev(1, "KICK", 0, 0, 0.35)], bass: [] });
    const p = buildLessonPlan(a, recipe);
    expect(p.steps[0].caution).toBeTruthy(); expect(p.steps[2].caution).toMatch(/bass|бас/i);
    expect(p.needs.find((n) => n.id === "bass")).toBeUndefined();
  });
  it("the user's genre correction re-targets the plan immediately", () => {
    const a = base({ genre: pred("house") });
    expect(buildLessonPlan({ ...a, genre_user: "techno" }, recipe).steps[0].items.map((i) => i.id)).toContain("tc-02-drums");
  });
  it("reads the track's own facts: pattern A, bass notes, section lengths", () => {
    const p = buildLessonPlan(base({ genre: pred("house") }), recipe);
    expect(p.steps[0].fromTrack).toContain("KICK 1·5"); expect(p.steps[2].fromTrack).toContain("F1"); expect(p.steps[6].fromTrack).toContain("1–10");
  });
  it("tempo hint: a half-time reading of a footwork track is flagged in the notes", () => {
    const p = buildLessonPlan(base({ genre: pred("footwork"), grid: { bpm: 80, origin: 0, beats_per_bar: 4, candidates: [160], confidence: 0.4 } as never }), recipe);
    expect(p.notes.join(" ")).toContain("160");
  });
});
