import { readStem } from "../sidecar";
import { getState, setState } from "../../state/store";
import { STEM_ORDER } from "../voices";
import { audio } from "./synth";

// Plays the user's own audio locally: the whole-track copy, the four stems, or a single stem,
// optionally limited to a time range (a section or one bar) that loops.
export type PlayMode = "mix" | "stems" | "bass" | "drums";
const PARTS: Record<PlayMode, string[]> = { mix: ["mix"], stems: STEM_ORDER, bass: ["bass"], drums: ["drums"] };

interface Track { buf: AudioBuffer; gain: GainNode; src?: AudioBufferSourceNode }
let bufs: Record<string, AudioBuffer> = {};
let bufsFor = "";
let active: Record<string, Track> = {};
let startedAt = 0, offset = 0, raf = 0;
let range: { from: number; to: number } | null = null;

async function ensure(parts: string[]): Promise<boolean> {
  const a = getState().analysis;
  if (!a) return false;
  if (bufsFor !== a.audio_hash) { bufs = {}; bufsFor = a.audio_hash; }
  const c = audio();
  const missing = parts.filter((p) => !bufs[p] && a.stems[p]);
  if (missing.length) setState({ stemLoading: true });
  try {
    for (const p of missing) bufs[p] = await c.decodeAudioData(await readStem(a.stems[p].path));
    return parts.some((p) => bufs[p]);
  } catch (e) {
    setState({ error: `Не удалось загрузить аудио: ${e instanceof Error ? e.message : String(e)}` });
    return false;
  } finally { setState({ stemLoading: false }); }
}

export function applyGains() {
  const { stemMute, stemSolo } = getState();
  for (const [part, l] of Object.entries(active)) {
    const on = stemSolo ? stemSolo === part : !stemMute[part];
    l.gain.gain.value = on || part === "mix" ? 1 : 0;
  }
}

function tick() {
  const c = audio();
  let t = offset + (c.currentTime - startedAt);
  if (range && t >= range.to) { void startAt(range.from); return; }          // loop the range
  const dur = Math.max(...Object.values(active).map((l) => l.buf.duration), 0);
  if (t >= dur) { stopStems(); setState({ stemTime: 0 }); return; }
  t = Math.max(0, t);
  setState({ stemTime: t });
  raf = requestAnimationFrame(tick);
}

function stopSources() {
  for (const l of Object.values(active)) { try { l.src?.stop(); } catch { /* already stopped */ } l.src?.disconnect(); }
  active = {};
}

async function startAt(from: number) {
  stopSources();
  const c = audio();
  offset = Math.max(0, from); startedAt = c.currentTime + 0.03;
  for (const [part, buf] of Object.entries(currentParts)) {
    const gain = c.createGain(); gain.connect(c.destination);
    const src = c.createBufferSource(); src.buffer = buf; src.connect(gain); src.start(startedAt, offset);
    active[part] = { buf, gain, src };
  }
  applyGains();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}

let currentParts: Record<string, AudioBuffer> = {};
let beforePlay: () => void = () => {};
/** The synth sequencer registers itself here so the two never play over each other. */
export function onBeforePlay(fn: () => void) { beforePlay = fn; }

/** Start playback. `tag` identifies what is playing so screens can show a ▶/■ state on the right element. */
export async function play(mode: PlayMode, opts: { from?: number; to?: number; tag?: string } = {}) {
  beforePlay();
  if (!(await ensure(PARTS[mode]))) return;
  currentParts = Object.fromEntries(PARTS[mode].filter((p) => bufs[p]).map((p) => [p, bufs[p]]));
  range = opts.to != null ? { from: opts.from ?? 0, to: opts.to } : null;
  await startAt(opts.from ?? getState().stemTime);
  setState({ stemPlaying: true, playing: true, audioTag: opts.tag ?? mode });
}
export function stopStems() {
  cancelAnimationFrame(raf); stopSources(); range = null;
  setState({ stemPlaying: false, playing: false, audioTag: null });
}
export async function toggleAudio(mode: PlayMode, opts: { from?: number; to?: number; tag?: string } = {}) {
  const tag = opts.tag ?? mode;
  if (getState().stemPlaying && getState().audioTag === tag) stopStems(); else await play(mode, opts);
}
export const toggleStems = () => toggleAudio("stems");
export const toggleMix = () => toggleAudio("mix");
export function seekStems(t: number) {
  setState({ stemTime: t });
  if (getState().stemPlaying) { const m = getState().audioTag; void startAt(t); void m; }
}
