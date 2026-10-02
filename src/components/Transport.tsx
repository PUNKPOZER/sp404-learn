import { setLoop, stopPlay, togglePlay } from "../lib/audio/preview";
import { setState, useStore } from "../state/store";

export function Transport() {
  const s = useStore((x) => x);
  const bpm = s.previewBpm ?? s.analysis?.grid.bpm ?? s.recipe?.bpm ?? 160;
  const patterns = s.screen === "tutorial" ? [] : s.recipe?.patterns ?? [];
  const label = s.screen === "drums" ? `BAR ${s.currentBar + 1}` : s.screen === "tutorial" ? "LESSON STATE" : `PATTERN ${s.activePattern}`;
  return (
    <footer className="transport">
      <button className={`btn big ${s.playing ? "on" : ""}`} onClick={togglePlay}>{s.playing ? "■ STOP" : "▶ PLAY"}</button>
      <button className="btn" onClick={stopPlay} disabled={!s.playing}>STOP</button>
      <button className={`btn ${s.loop ? "on" : ""}`} aria-pressed={s.loop} onClick={() => setLoop(!s.loop)}>LOOP</button>
      <div className="bpm">
        <span className="k">BPM</span>
        <button className="btn sm" onClick={() => setState({ previewBpm: Math.max(40, Math.round(bpm) - 1) })}>−</button>
        <b>{bpm.toFixed(bpm % 1 ? 1 : 0)}</b>
        <button className="btn sm" onClick={() => setState({ previewBpm: Math.min(240, Math.round(bpm) + 1) })}>+</button>
        {s.previewBpm != null && <button className="btn sm" title="Back to track tempo" onClick={() => setState({ previewBpm: null })}>RESET</button>}
      </div>
      <div className="grow" />
      <span className="k">PLAYING</span><b className="mono">{label}</b>
      {patterns.length > 0 && s.screen !== "drums" && (
        <div className="seg">{patterns.map((p) => (
          <button key={p.name} className={`btn sm ${s.activePattern === p.name ? "on" : ""}`} onClick={() => setState({ activePattern: p.name })}>{p.name}</button>
        ))}</div>
      )}
      <span className="k">PREVIEW: SYNTH</span>
    </footer>
  );
}
