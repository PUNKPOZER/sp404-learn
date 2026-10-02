import { audio, trigger } from "./synth";
import type { StepMap } from "../types";

// Lookahead step scheduler. Reads the pattern and BPM through getters on every tick, so
// clicking a cell while playing changes what you hear on the next pass.
export class Sequencer {
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  playing = false;
  loop = true;
  onStep: (step: number) => void = () => {};
  onStop: () => void = () => {};

  constructor(private getPattern: () => StepMap, private getBpm: () => number, private getNotes: () => Record<string, Record<string, number>> = () => ({})) {}

  start() {
    if (this.playing) return;
    const c = audio();
    this.playing = true; this.step = 0; this.nextTime = c.currentTime + 0.06;
    this.timer = window.setInterval(() => this.tick(), 25);
  }
  stop() {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null; this.playing = false; this.onStop();
  }
  private tick() {
    const c = audio();
    while (this.nextTime < c.currentTime + 0.12) {
      const pat = this.getPattern();
      const s = this.step;
      for (const [voice, steps] of Object.entries(pat)) if (steps.includes(s + 1)) trigger(voice, this.nextTime, 0.9, c, this.getNotes()[voice]?.[String(s + 1)]);
      const delay = Math.max(0, (this.nextTime - c.currentTime) * 1000);
      window.setTimeout(() => this.onStep(s), delay);
      this.nextTime += 60 / this.getBpm() / 4;
      this.step = (this.step + 1) % 16;
      if (this.step === 0 && !this.loop) { window.setTimeout(() => this.stop(), delay + 60000 / this.getBpm() / 4); return; }
    }
  }
}
