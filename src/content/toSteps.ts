import type { TutorialStep } from "../lib/types";
import type { Step } from "./types";

const shortTitle = (t: string) => { const first = t.split(/(?<=[.!?])\s/)[0].replace(/[[\]]/g, ""); return first.length > 46 ? `${first.slice(0, 44).trimEnd()}…` : first; };

/** Adapt verified FX/TRICKS steps to the shared lesson renderer (same TutorialStep shape as courses and track tutorials). */
export function stepsFromContent(title: string, steps: Step[]): TutorialStep[] {
  return steps.map((s, i) => ({
    id: i, total: steps.length, section: title, title: shortTitle(s.text), text: s.text, voice: null, pad: null, highlight: [], grid: {},
    controls: s.controls ?? [], pads: s.pads ?? [],
  }));
}
