/** Practice Mode — pure logic (no audio, no DOM): text rows, visibility modes, timing → step, judging, keyboard layout, stats.
 *  The runtime that plays and listens lives in lib/audio/practice.ts; hardware (MIDI) input is only an interface here
 *  (see HARDWARE_PRACTICE_PLAN.md) — nothing in this file assumes it. */
import { DEFAULT_KIT } from "./voices";

export type Phase = "listen" | "watch" | "copy" | "play";
export type Visibility = "show" | "hide" | "memory";
export const PHASES: Phase[] = ["listen", "watch", "copy", "play"];
export const VISIBILITIES: Visibility[] = ["show", "hide", "memory"];
export const STEPS = 16;

export interface Spec { voices: Record<string, number[]>; bpm: number; bars?: number }

/** "1--- ---- 1--- ----" — the pattern as text (also the accessible description of a row). */
export function rowText(steps: number[], total = STEPS): string {
  let out = "";
  for (let s = 1; s <= total; s++) {
    out += steps.includes(s) ? "1" : "-";
    if (s % 4 === 0 && s < total) out += " ";
  }
  return out;
}

/** Share of a pattern's steps that is hidden (0..1). SHOW ALL never hides; HIDE STEPS hides everything while you PLAY;
 *  MEMORY hides more each round you play: 50 % → 75 % → everything. LISTEN / WATCH / COPY always show the pattern. */
export function hiddenFraction(v: Visibility, phase: Phase, round: number): number {
  if (v === "show" || phase !== "play") return 0;
  if (v === "hide") return 1;
  return [0.5, 0.75, 1][Math.max(0, Math.min(2, round))];
}
/** Which of a voice's steps stay visible: the last ⌈n·fraction⌉ steps in time order are hidden (deterministic). */
export function visibleSteps(steps: number[], fraction: number): number[] {
  const sorted = [...steps].sort((a, b) => a - b);
  const hide = Math.ceil(sorted.length * fraction - 1e-9);
  return hide <= 0 ? sorted : sorted.slice(0, Math.max(0, sorted.length - hide));
}

export interface Hit { voice: string; step: number; offset: number; bar: number }
/** Map a time to the nearest step. `offset` is how far from that step, in steps (+ late, − early). */
export function stepAtTime(t: number, t0: number, stepDur: number): Omit<Hit, "voice"> {
  const pos = (t - t0) / stepDur;
  const nearest = Math.round(pos);
  const idx = ((nearest % STEPS) + STEPS) % STEPS;
  return { step: idx + 1, offset: pos - nearest, bar: Math.floor(nearest / STEPS) };
}

export interface Judgement {
  expected: number; matched: number; extra: number; score: number; passed: boolean;
  missed: { voice: string; step: number }[]; wrong: Hit[]; meanOffsetMs: number;
}
export const TOLERANCE_STEPS = 0.4;        // a tap within ±0.4 of a step counts (≈ ±75 ms at 160 BPM, ±100 ms at 120 BPM)
/** Compare the learner's taps with the pattern over `bars` bars. A tap matches an expected note of the same voice, on the
 *  same step, within the tolerance; every expected note matches at most once per bar. */
export function judge(voices: Record<string, number[]>, hits: Hit[], bars: number, stepMs: number, tol = TOLERANCE_STEPS): Judgement {
  let matched = 0, expected = 0;
  const missed: Judgement["missed"] = [];
  const used = new Set<Hit>();
  const offs: number[] = [];
  for (let b = 0; b < bars; b++) {
    for (const [voice, steps] of Object.entries(voices)) {
      for (const s of steps) {
        expected++;
        const h = hits.find((x) => !used.has(x) && x.bar === b && x.voice === voice && x.step === s && Math.abs(x.offset) <= tol);
        if (h) { used.add(h); matched++; offs.push(h.offset * stepMs); } else missed.push({ voice, step: s });
      }
    }
  }
  const wrong = hits.filter((h) => !used.has(h) && h.bar >= 0 && h.bar < bars);
  const extra = wrong.length;
  const score = expected ? matched / (expected + extra) : 0;
  const passed = expected > 0 && matched / expected >= 0.8 && extra <= Math.ceil(expected * 0.25);
  const uniqMissed = [...new Map(missed.map((m) => [`${m.voice}:${m.step}`, m])).values()].filter((m) => !hits.some((h) => h.voice === m.voice && h.step === m.step && Math.abs(h.offset) <= tol)).slice(0, 12);
  return { expected, matched, extra, score, passed, missed: uniqMissed, wrong, meanOffsetMs: offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0 };
}

/** Computer keyboard laid out like the unit: bottom row = pads 1–4, then 5–8, 9–12, top row = 13–16. */
const KEYROWS = ["1234", "qwer", "asdf", "zxcv"];   // top → bottom, as on the device
export function keyToPad(key: string): number | null {
  const k = key.toLowerCase();
  for (let r = 0; r < 4; r++) {
    const c = KEYROWS[r].indexOf(k);
    if (c >= 0) return (3 - r) * 4 + c + 1;
  }
  return null;
}
export const padToKey = (pad: number): string => KEYROWS[3 - Math.floor((pad - 1) / 4)][(pad - 1) % 4].toUpperCase();
export function voiceOfPad(pad: number, kit: Record<number, string> = DEFAULT_KIT): string | null { return kit[pad] ?? null; }
export function padOfVoice(voice: string, kit: Record<number, string> = DEFAULT_KIT): number | null {
  const p = Object.keys(kit).map(Number).sort((a, b) => a - b).find((n) => kit[n] === voice);
  return p ?? null;
}

/** Input adapters. Today: on-screen pads and the computer keyboard. A MIDI adapter is a *plan* (HARDWARE_PRACTICE_PLAN.md), not code. */
export interface PracticeHit { pad?: number; voice?: string; velocity?: number }
export interface PracticeInput { name: string; start(onHit: (h: PracticeHit) => void): () => void }
export const keyboardInput: PracticeInput = {
  name: "keyboard",
  start(onHit) {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const pad = keyToPad(e.key);
      if (pad != null) { e.preventDefault(); onHit({ pad }); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  },
};

// ---- progress (local, optional) -------------------------------------------------------------------------------------------
export interface PracticeStat { best: number; runs: number; passed: number; last: number }
export function updateStat(prev: PracticeStat | undefined, j: Pick<Judgement, "score" | "passed">, now = Date.now()): PracticeStat {
  return { best: Math.max(prev?.best ?? 0, j.score), runs: (prev?.runs ?? 0) + 1, passed: (prev?.passed ?? 0) + (j.passed ? 1 : 0), last: now };
}
const KEY = "sp404learn.practice";
export function loadStats(): Record<string, PracticeStat> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, PracticeStat>; } catch { return {}; }
}
export function saveStat(id: string, j: Pick<Judgement, "score" | "passed">): Record<string, PracticeStat> {
  const all = { ...loadStats(), [id]: updateStat(loadStats()[id], j) };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* in-memory only */ }
  return all;
}
