import { readStem } from "../sidecar";
import { getState, setState } from "../../state/store";
import { STEM_ORDER } from "../voices";
import { audio } from "./synth";

// Plays the separated stems (the user's own file, locally) in sync, with mute / solo per part.
interface Loaded { buf: AudioBuffer; gain: GainNode; src?: AudioBufferSourceNode }
let loaded: Record<string, Loaded> = {};
let loadedFor = "";
let startedAt = 0;
let offset = 0;
let raf = 0;

async function load() {
  const a = getState().analysis;
  if (!a) return false;
  if (loadedFor === a.audio_hash && Object.keys(loaded).length) return true;
  const c = audio();
  setState({ stemLoading: true });
  try {
    const next: Record<string, Loaded> = {};
    for (const part of STEM_ORDER) {
      const info = a.stems[part];
      if (!info) continue;
      const buf = await c.decodeAudioData(await readStem(info.path));
      const gain = c.createGain(); gain.connect(c.destination);
      next[part] = { buf, gain };
    }
    loaded = next; loadedFor = a.audio_hash;
    return true;
  } catch (e) {
    setState({ error: `Could not load stems: ${e instanceof Error ? e.message : String(e)}` });
    return false;
  } finally { setState({ stemLoading: false }); }
}

export function applyGains() {
  const { stemMute, stemSolo } = getState();
  for (const [part, l] of Object.entries(loaded)) {
    const on = stemSolo ? stemSolo === part : !stemMute[part];
    l.gain.gain.value = on ? 1 : 0;
  }
}

function tick() {
  const c = audio();
  const t = offset + (c.currentTime - startedAt);
  const dur = Math.max(...Object.values(loaded).map((l) => l.buf.duration), 0);
  if (t >= dur) { stopStems(); setState({ stemTime: 0 }); return; }
  setState({ stemTime: t });
  raf = requestAnimationFrame(tick);
}

export async function playStems(from = getState().stemTime) {
  if (!(await load())) return;
  stopSources();
  const c = audio();
  offset = Math.max(0, from); startedAt = c.currentTime + 0.03;
  for (const l of Object.values(loaded)) {
    const src = c.createBufferSource(); src.buffer = l.buf; src.connect(l.gain);
    src.start(startedAt, offset); l.src = src;
  }
  applyGains();
  setState({ stemPlaying: true, playing: true });
  cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}

function stopSources() {
  for (const l of Object.values(loaded)) { try { l.src?.stop(); } catch { /* already stopped */ } l.src = undefined; }
}
export function stopStems() {
  cancelAnimationFrame(raf); stopSources();
  setState({ stemPlaying: false, playing: false });
}
export async function toggleStems() { if (getState().stemPlaying) stopStems(); else await playStems(); }
export function seekStems(t: number) {
  setState({ stemTime: t });
  if (getState().stemPlaying) void playStems(t);
}
