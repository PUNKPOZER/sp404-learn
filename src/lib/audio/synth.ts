// Built-in synthesized drum voices (royalty-free by construction — no samples, no user audio).
let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

export function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function env(g: GainNode, t: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}
function osc(c: AudioContext, t: number, f0: number, f1: number, dur: number, peak: number, type: OscillatorType = "sine") {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * 0.5);
  env(g, t, peak, dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function burst(c: AudioContext, t: number, kind: BiquadFilterType, freq: number, dur: number, peak: number, q = 0.7) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise(c); f.type = kind; f.frequency.value = freq; f.Q.value = q;
  env(g, t, peak, dur); s.connect(f).connect(g).connect(c.destination); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

export function trigger(voice: string, t: number, vel = 0.9, c: AudioContext = audio(), midi?: number) {
  const v = Math.max(0.1, Math.min(1, vel));
  switch (voice) {
    case "KICK": osc(c, t, 160, 42, 0.32, 1.0 * v); break;
    case "SNARE": osc(c, t, 200, 170, 0.12, 0.45 * v, "triangle"); burst(c, t, "highpass", 1800, 0.16, 0.7 * v); break;
    case "CLAP": [0, 0.011, 0.023].forEach((o) => burst(c, t + o, "bandpass", 1500, 0.02, 0.6 * v, 1.2)); burst(c, t + 0.03, "bandpass", 1500, 0.12, 0.35 * v, 1.2); break;
    case "CLOSED_HAT": burst(c, t, "highpass", 7500, 0.04, 0.35 * v); break;
    case "OPEN_HAT": burst(c, t, "highpass", 7000, 0.3, 0.35 * v); break;
    case "PERCUSSION": osc(c, t, 700, 600, 0.1, 0.5 * v); break;
    case "BASS": { const f = 440 * 2 ** (((midi ?? 29) - 69) / 12); osc(c, t, f, f, 0.4, 0.55 * v, "sawtooth"); osc(c, t, f, f, 0.4, 0.8 * v); break; }
    case "VOCAL": osc(c, t, 520, 480, 0.18, 0.3 * v, "square"); burst(c, t, "bandpass", 1100, 0.18, 0.3 * v, 4); break;
    case "CHOP": osc(c, t, 330, 330, 0.15, 0.3 * v, "triangle"); break;
    default: burst(c, t, "bandpass", 3000, 0.1, 0.2 * v, 2);
  }
}
