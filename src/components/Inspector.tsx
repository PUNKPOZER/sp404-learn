import { DRUM_TYPES } from "../lib/types";
import { deleteEvent, setPadVoice, updateEvent } from "../state/actions";
import { useStore } from "../state/store";
import { ALL_VOICES, VOICE_LABELS } from "../lib/voices";
import { SP404PadGrid } from "./SP404PadGrid";
import { padOf } from "../lib/kit";

export function Inspector() {
  const s = useStore((x) => x);
  const ev = s.analysis?.events.find((e) => e.id === s.selectedEventId);
  return (
    <aside className="inspector">
      <h3>INSPECTOR</h3>
      {ev ? (
        <div className="fields">
          <label>INSTRUMENT
            <select value={ev.type} onChange={(e) => updateEvent(ev.id, { type: e.target.value as typeof ev.type })}>
              {[...DRUM_TYPES, "UNKNOWN" as const].map((t) => <option key={t} value={t}>{VOICE_LABELS[t]}</option>)}
            </select>
          </label>
          <div className="row2"><span className="k">TIME</span><b className="mono">{ev.time.toFixed(3)} s</b></div>
          <div className="row2"><span className="k">BAR / STEP</span><b className="mono">{ev.bar + 1} / {Math.floor((ev.step * 16) / (s.analysis?.resolution ?? 16)) + 1}</b></div>
          <div className="row2"><span className="k">CONFIDENCE</span>
            <b className={`mono ${ev.confidence < 0.5 ? "warn" : ""}`}>{ev.manual ? "MANUAL" : `${(ev.confidence * 100).toFixed(0)}%`}</b></div>
          <div className="meter"><i style={{ width: `${ev.confidence * 100}%` }} /></div>
          <label>VELOCITY {(ev.velocity * 100).toFixed(0)}
            <input type="range" min={10} max={100} value={ev.velocity * 100} onChange={(e) => updateEvent(ev.id, { velocity: +e.target.value / 100 })} />
          </label>
          <div className="row2"><span className="k">TIMING OFFSET</span>
            <b className="mono">{ev.manual ? "0.0" : (ev.timing_offset * 1000).toFixed(1)} ms</b></div>
          <div className="row2"><span className="k">PAD</span><b className="mono">{padOf(ev.type, s.kit) ?? "—"}</b></div>
          <button className="btn danger" onClick={() => deleteEvent(ev.id)}>DELETE EVENT</button>
        </div>
      ) : s.screen === "recipe" ? (
        <div className="fields">
          <p className="hint">Click a pad to change what lives on it.</p>
          {s.selectedPad != null ? (
            <label>PAD {s.selectedPad}
              <select value={s.kit[s.selectedPad] ?? ""} onChange={(e) => setPadVoice(s.selectedPad!, e.target.value)}>
                {ALL_VOICES.map((v) => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}
              </select>
            </label>
          ) : <p className="hint">No pad selected.</p>}
        </div>
      ) : s.analysis ? (
        <div className="fields">
          <div className="row2"><span className="k">EVENTS</span><b className="mono">{s.analysis.events.length}</b></div>
          <div className="row2"><span className="k">LOW CONFIDENCE</span><b className="mono">{s.analysis.events.filter((e) => e.confidence < 0.5 && !e.manual).length}</b></div>
          <div className="row2"><span className="k">MANUAL</span><b className="mono">{s.analysis.events.filter((e) => e.manual).length}</b></div>
          <p className="hint">Select an event on the DRUMS grid to inspect or edit it.</p>
          <div className="mini-pads"><SP404PadGrid kit={s.kit} /></div>
        </div>
      ) : <p className="hint">Nothing selected.</p>}
    </aside>
  );
}
