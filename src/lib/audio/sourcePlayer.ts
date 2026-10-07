import { readStem } from "../sidecar";
import { audio } from "./synth";
import { getState, setState } from "../../state/store";
import { t } from "../i18n";

// Plays a project's own source audio (before any analysis exists): decode once, play from a start time, stop.
let buf: AudioBuffer | null = null, bufFor = "", src: AudioBufferSourceNode | null = null, startedAt = 0, offset = 0, raf = 0;

async function ensure(path: string): Promise<boolean> {
  if (buf && bufFor === path) return true;
  try { buf = await audio().decodeAudioData(await readStem(path)); bufFor = path; return true; }
  catch (e) { setState({ error: t("Не удалось загрузить аудио", "Could not load the audio") + `: ${e instanceof Error ? e.message : String(e)}` }); return false; }
}
export function stopSource() {
  cancelAnimationFrame(raf);
  try { src?.stop(); } catch { /* already stopped */ }
  src?.disconnect(); src = null;
  setState({ playing: false, stemPlaying: false, stemTime: 0 });
}
export async function toggleSource(path: string, from = 0) {
  if (getState().playing && src) { stopSource(); return; }
  if (!(await ensure(path)) || !buf) return;
  const c = audio();
  src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination);
  offset = from; startedAt = c.currentTime + 0.03; src.start(startedAt, offset);
  setState({ playing: true, stemPlaying: true });
  const tick = () => {
    const tt = offset + (c.currentTime - startedAt);
    if (!buf || tt >= buf.duration) { stopSource(); return; }
    setState({ stemTime: Math.max(0, tt) });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
