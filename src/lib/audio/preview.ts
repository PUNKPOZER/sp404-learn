import { getState, setState } from "../../state/store";
import { Sequencer } from "./sequencer";
import type { StepMap } from "../types";
import { onBeforePlay, stopStems, toggleMix, toggleStems } from "./stemPlayer";

/** What the transport plays depends on the screen: the current bar on DRUMS, the selected
 *  pattern on RECIPE, and the visible step-grid state in a tutorial. */
export function currentPattern(): StepMap {
  const s = getState();
  if (s.screen === "tutorial" && s.tutorial) return s.tutorial.steps[s.tutorial.index]?.grid ?? {};
  if (s.screen === "bass" && s.analysis) {
    const out: StepMap = {};
    for (const b of s.analysis.bass) if (b.bar === s.currentBar) (out.BASS ??= []).push(Math.floor((b.step * 16) / s.analysis.resolution) + 1);
    return out;
  }
  if (s.screen === "drums" && s.analysis) {
    const out: StepMap = {};
    const res = s.analysis.resolution;
    for (const e of s.analysis.events)
      if (e.bar === s.currentBar && e.confidence >= s.minConfidence) {
        const st = Math.floor((e.step * 16) / res) + 1;
        (out[e.type] ??= []).push(st);
      }
    return out;
  }
  return s.recipe?.patterns.find((p) => p.name === s.activePattern)?.steps ?? {};
}
export function currentBpm(): number {
  const s = getState();
  return s.previewBpm ?? s.analysis?.grid.bpm ?? s.recipe?.bpm ?? 160;
}

export function currentNotes(): Record<string, Record<string, number>> {
  const s = getState();
  if (s.screen === "bass" && s.analysis) {
    const m: Record<string, number> = {};
    for (const b of s.analysis.bass) if (b.bar === s.currentBar) m[String(Math.floor((b.step * 16) / s.analysis.resolution) + 1)] = b.midi;
    return { BASS: m };
  }
  if (s.screen === "tutorial" || s.screen === "drums") return {};
  const n = s.recipe?.patterns.find((p) => p.name === s.activePattern)?.notes;
  return (n as Record<string, Record<string, number>>) ?? {};
}

export const sequencer = new Sequencer(currentPattern, currentBpm, currentNotes);
sequencer.onStep = (step) => setState({ playStep: step, playing: true });
sequencer.onStop = () => setState({ playing: false, playStep: -1 });

onBeforePlay(() => { if (sequencer.playing) sequencer.stop(); });

export function togglePlay() {
  if (getState().stemPlaying && getState().screen !== "stems" && getState().screen !== "track") { stopStems(); return; }
  if (getState().screen === "stems") { void toggleStems(); return; }
  if (getState().screen === "track") { void toggleMix(); return; }
  if (sequencer.playing) sequencer.stop(); else sequencer.start(); setState({ playing: sequencer.playing }); }
export function stopPlay() { if (sequencer.playing) sequencer.stop(); }
export function setLoop(v: boolean) { sequencer.loop = v; setState({ loop: v }); }
