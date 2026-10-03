import { seekStems } from "../lib/audio/stemPlayer";
import { SectionStrip } from "../components/ArrangementStrip";
import { SECTION_LEGEND } from "../lib/sections";
import { playingSection, toggleSection } from "../lib/sectionPlay";
import { Waveform } from "../components/Waveform";
import { doubleBpm, halveBpm, nudgeDownbeat, nudgeStep, setGrid } from "../state/actions";
import { setState, useStore } from "../state/store";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Track() {
  const { analysis: a, peaks, currentBar, stemTime, audioTag, stemPlaying, recipe } = useStore((s) => s);
  if (!a) return null;
  const c = a.characteristics;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>{a.filename}</h1>
        <span className="mono dim">{fmt(a.duration)} · {a.sample_rate} Hz · {a.channels} ch</span>
      </header>
      <Waveform peaks={peaks} analysis={a} currentBar={currentBar} playTime={a.stems.mix ? stemTime : null}
        onBar={(b) => setState({ currentBar: b })} onSeek={(t) => a.stems.mix && seekStems(t)} />
      <section className="panel" data-tour="sections">
        <h2>Структура трека <small>нажми на блок — он заиграет</small></h2>
        <SectionStrip analysis={a} recipe={recipe} showPlay={!!a.stems.mix} playingIndex={stemPlaying ? playingSection(audioTag) : null}
          onPick={(i) => a.stems.mix && void toggleSection(a.sections[i], i)} />
        <div className="legend" style={{ marginTop: 10 }}>{SECTION_LEGEND.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>
      </section>
      {!a.stems.mix && <p className="hint">Воспроизведение недоступно для этого анализа — открой трек заново.</p>}
      <div className="bpm-panel" data-tour="bpm">
        <div className="bpm-big"><span className="k">BPM</span><b>{a.grid.bpm.toFixed(1)}</b></div>
        <button className="btn" onClick={halveBpm}>÷2</button>
        <button className="btn" onClick={doubleBpm}>×2</button>
        <button className="btn" onClick={() => {
          const v = window.prompt("BPM", a.grid.bpm.toFixed(2)); const n = v ? parseFloat(v) : NaN;
          if (n >= 40 && n <= 260) void setGrid({ bpm: n });
        }}>Править</button>
        <span className="k">ПЕРВАЯ ДОЛЯ</span>
        <button className="btn sm" title="Сдвинуть шаг 1 на долю раньше" onClick={() => nudgeDownbeat(-1)}>◀ Доля</button>
        <button className="btn sm" title="Сдвинуть шаг 1 на долю позже" onClick={() => nudgeDownbeat(1)}>Доля ▶</button>
        <button className="btn sm" title="Сдвинуть шаг 1 на шестнадцатую раньше" onClick={() => nudgeStep(-1)}>◀ Шаг</button>
        <button className="btn sm" title="Сдвинуть шаг 1 на шестнадцатую позже" onClick={() => nudgeStep(1)}>Шаг ▶</button>
        <span className="k">КВАНТАЙЗ</span>
        <div className="seg">{[4, 8, 16, 32].map((r) => (
          <button key={r} className={`btn sm ${a.resolution === r ? "on" : ""}`} onClick={() => setGrid({}, r)}>1/{r}</button>
        ))}</div>
        <span className="k">УВЕРЕННОСТЬ В ТЕМПЕ</span><b className={`mono ${a.grid.confidence < 0.4 ? "warn" : ""}`}>{(a.grid.confidence * 100).toFixed(0)}%</b>
      </div>
      {a.grid.candidates.length > 0 && <p className="hint">Другие вероятные значения: {a.grid.candidates.map((c) => (
        <button key={c} className="link" onClick={() => setGrid({ bpm: c })}>{c}</button>))}</p>}
      <div className="grid2">
        <section className="panel">
          <h2>Характеристики</h2>
          <table className="kv"><tbody>
            {[["Бочек / такт", c.kick_density], ["Снейр+клэп / такт", c.snare_density], ["Хэтов / такт", c.hat_density], ["Перк. / такт", c.perc_density],
              ["Синкопа", c.syncopation, true], ["Четыре в пол", c.four_on_floor, true], ["Разброс тайминга, мс", c.timing_variation_ms]]
              .map(([k, v, pct]) => <tr key={k as string}><td>{k as string}</td><td className="mono">{pct ? `${((v as number) * 100).toFixed(0)}%` : (v as number).toFixed(1)}</td></tr>)}
          </tbody></table>
        </section>
        <section className="panel">
          <h2>Вероятный стиль <small>подсказка, не вердикт</small></h2>
          {a.likely_styles.map((s) => (
            <div key={s.style} className="style"><span>{s.style}</span><div className="meter"><i style={{ width: `${s.score * 100}%` }} /></div><small>{s.why}</small></div>
          ))}
        </section>
      </div>
      {a.warnings.length > 0 && <section className="panel warnbox"><h2>ЗАМЕТКИ</h2>{a.warnings.map((w, i) => <p key={i}>{w}</p>)}</section>}
    </div>
  );
}
