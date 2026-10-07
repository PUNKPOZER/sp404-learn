import { audio, trigger } from "./synth";
import { STEPS, stepAtTime, type Hit, type Phase, type Spec } from "../practice";

export interface RunOptions {
  spec: Spec; phase: Phase; bars: number;
  /** play the pattern aloud (LISTEN / WATCH / COPY with sound on) */
  audiblePattern: boolean;
  /** metronome clicks on every beat */
  click: boolean;
  countInBeats?: number;
  onStep: (step: number, bar: number, countIn: number) => void;     // step 0-based, -1 during the count-in
  onDone: (hits: Hit[], stepMs: number) => void;
}

/** Plays one run of an exercise on the Web Audio clock and records the learner's taps against it.
 *  Taps are placed on the same clock (minus the output latency), so what is judged is what the learner heard. */
export class PracticeEngine {
  running = false;
  private timer: number | null = null;
  private t0 = 0;
  private stepDur = 0;
  private idx = 0;
  private hits: Hit[] = [];
  private opts!: RunOptions;
  private total = 0;
  private countIn = 0;

  start(o: RunOptions) {
    this.stop(false);
    const c = audio();
    this.opts = o; this.hits = [];
    const beat = 60 / o.spec.bpm;
    this.stepDur = beat / 4;
    this.countIn = (o.countInBeats ?? (o.phase === "listen" || o.phase === "watch" ? 0 : 4)) * 4;
    this.total = o.bars * STEPS;
    this.idx = -this.countIn;
    this.t0 = c.currentTime + 0.12 + this.countIn * this.stepDur;       // time of the first scored step
    this.running = true;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick() {
    const c = audio();
    while (this.running && this.t0 + this.idx * this.stepDur < c.currentTime + 0.12) {
      const time = this.t0 + this.idx * this.stepDur;
      const i = this.idx;
      const o = this.opts;
      if (i % 4 === 0 && (o.click || i < 0)) trigger("CLOSED_HAT", time, i < 0 || i % 16 === 0 ? 0.55 : 0.3);
      if (i >= 0 && o.audiblePattern) {
        const s = i % STEPS;
        for (const [voice, steps] of Object.entries(o.spec.voices)) if (steps.includes(s + 1)) trigger(voice, time, 0.9);
      }
      const delay = Math.max(0, (time - c.currentTime) * 1000);
      const step = i < 0 ? -1 : i % STEPS, bar = i < 0 ? 0 : Math.floor(i / STEPS), left = i < 0 ? -i : 0;
      window.setTimeout(() => this.running && o.onStep(step, bar, left), delay);
      this.idx++;
      if (this.idx >= this.total) {
        window.setTimeout(() => this.finish(), delay + this.stepDur * 1000 + 120);
        this.idx = Number.MAX_SAFE_INTEGER;
        if (this.timer != null) window.clearInterval(this.timer);
        this.timer = null;
        return;
      }
    }
  }

  /** The learner presses a pad: sound it now and, if a run is active, record it. */
  hit(voice: string) {
    const c = audio();
    trigger(voice, c.currentTime, 0.9);
    if (!this.running) return;
    const t = c.currentTime - (c.outputLatency || c.baseLatency || 0);
    const rel = (t - this.t0) / this.stepDur;
    if (rel < -2 || rel > this.total + 1) return;                      // outside the scored area
    const h = stepAtTime(t, this.t0, this.stepDur);
    if (h.bar < 0 || h.bar >= this.opts.bars) return;
    this.hits.push({ voice, ...h });
  }

  private finish() {
    if (!this.running) return;
    this.running = false;
    this.opts.onDone(this.hits, this.stepDur * 1000);
  }
  stop(notify = true) {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
    const was = this.running;
    this.running = false;
    if (was && notify) this.opts.onStep(-1, 0, 0);
  }
}
