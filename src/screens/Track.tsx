import { Waveform } from "../components/Waveform";
import { doubleBpm, halveBpm, nudgeDownbeat, nudgeStep, setGrid } from "../state/actions";
import { setState, useStore } from "../state/store";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Track() {
  const { analysis: a, peaks, currentBar } = useStore((s) => s);
  if (!a) return null;
  const c = a.characteristics;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>{a.filename}</h1>
        <span className="mono dim">{fmt(a.duration)} · {a.sample_rate} Hz · {a.channels} ch</span>
      </header>
      <Waveform peaks={peaks} analysis={a} currentBar={currentBar} onBar={(b) => setState({ currentBar: b })} />
      <div className="bpm-panel">
        <div className="bpm-big"><span className="k">BPM</span><b>{a.grid.bpm.toFixed(1)}</b></div>
        <button className="btn" onClick={halveBpm}>÷2</button>
        <button className="btn" onClick={doubleBpm}>×2</button>
        <button className="btn" onClick={() => {
          const v = window.prompt("BPM", a.grid.bpm.toFixed(2)); const n = v ? parseFloat(v) : NaN;
          if (n >= 40 && n <= 260) void setGrid({ bpm: n });
        }}>Edit</button>
        <span className="k">DOWNBEAT</span>
        <button className="btn sm" title="Move step 1 a beat earlier" onClick={() => nudgeDownbeat(-1)}>◀ Beat</button>
        <button className="btn sm" title="Move step 1 a beat later" onClick={() => nudgeDownbeat(1)}>Beat ▶</button>
        <button className="btn sm" title="Move step 1 one 16th earlier" onClick={() => nudgeStep(-1)}>◀ Step</button>
        <button className="btn sm" title="Move step 1 one 16th later" onClick={() => nudgeStep(1)}>Step ▶</button>
        <span className="k">QUANTIZE</span>
        <div className="seg">{[4, 8, 16, 32].map((r) => (
          <button key={r} className={`btn sm ${a.resolution === r ? "on" : ""}`} onClick={() => setGrid({}, r)}>1/{r}</button>
        ))}</div>
        <span className="k">TEMPO CONFIDENCE</span><b className={`mono ${a.grid.confidence < 0.4 ? "warn" : ""}`}>{(a.grid.confidence * 100).toFixed(0)}%</b>
      </div>
      {a.grid.candidates.length > 0 && <p className="hint">Other plausible readings: {a.grid.candidates.map((c) => (
        <button key={c} className="link" onClick={() => setGrid({ bpm: c })}>{c}</button>))}</p>}
      <div className="grid2">
        <section className="panel">
          <h2>Characteristics</h2>
          <table className="kv"><tbody>
            {[["Kick / bar", c.kick_density], ["Snare+clap / bar", c.snare_density], ["Hat / bar", c.hat_density], ["Perc / bar", c.perc_density],
              ["Syncopation", c.syncopation, true], ["Four-on-floor", c.four_on_floor, true], ["Timing variation ms", c.timing_variation_ms]]
              .map(([k, v, pct]) => <tr key={k as string}><td>{k as string}</td><td className="mono">{pct ? `${((v as number) * 100).toFixed(0)}%` : (v as number).toFixed(1)}</td></tr>)}
          </tbody></table>
        </section>
        <section className="panel">
          <h2>Likely style <small>hint, not a verdict</small></h2>
          {a.likely_styles.map((s) => (
            <div key={s.style} className="style"><span>{s.style}</span><div className="meter"><i style={{ width: `${s.score * 100}%` }} /></div><small>{s.why}</small></div>
          ))}
        </section>
      </div>
      {a.warnings.length > 0 && <section className="panel warnbox"><h2>NOTES</h2>{a.warnings.map((w, i) => <p key={i}>{w}</p>)}</section>}
    </div>
  );
}
