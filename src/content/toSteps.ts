import type { TutorialStep } from "../lib/types";
import type { Step } from "./types";
import type { LessonStep } from "./schema";
import { loc } from "./load";

const shortTitle = (t: string) => { const first = t.split(/(?<=[.!?])\s/)[0].replace(/[[\]]/g, ""); return first.length > 46 ? `${first.slice(0, 44).trimEnd()}…` : first; };

/** Adapt verified FX/TRICKS steps to the shared lesson renderer (same TutorialStep shape as courses and track tutorials). */
export function stepsFromContent(title: string, steps: Step[]): TutorialStep[] {
  return steps.map((s, i) => ({
    id: i, total: steps.length, section: title, title: shortTitle(s.text), text: s.text, voice: null, pad: null, highlight: [], grid: {},
    controls: s.controls ?? [], pads: s.pads ?? [],
  }));
}

/** Lesson / Trick / FX steps (Learning Library 2.0) → the shared TutorialStep shape (so the one renderer shows them). */
export function stepsFromLessonSteps(section: string, steps: LessonStep[]): TutorialStep[] {
  return steps.map((s, i) => {
    const voices = s.stepPattern?.voices ?? {};
    const text = loc(s.text);
    return {
      id: i, total: steps.length, section, title: shortTitle(text), text, voice: null, pad: null, highlight: [],
      grid: voices as TutorialStep["grid"], controls: s.deviceHighlight?.controls ?? [], pads: s.deviceHighlight?.pads ?? [],
      kind: s.kind, why: s.why ? loc(s.why) : undefined, tryIt: s.tryIt ? loc(s.tryIt) : undefined,
      parameter: s.parameterExample ? { control: s.parameterExample.control, setting: s.parameterExample.setting, effect: loc(s.parameterExample.effect) } : undefined,
    };
  });
}
