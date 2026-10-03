import { useMemo } from "react";
import { setState, useStore } from "../state/store";
import { noteName } from "../lib/voices";

export function Bass() {
  const { analysis: a, currentBar } = useStore((s) => s);
  const notes = useMemo(() => (a ? a.bass.filter((b) => b.bar === currentBar) : []), [a, currentBar]);
  if (!a) return null;
  const nBars = Math.max(1, a.bass.reduce((m, b) => Math.max(m, b.bar), 0) + 1);
  const used = [...new Set(notes.map((n) => n.midi))].sort((x, y) => y - x);
  const lo = used.length ? Math.min(...used) - 1 : 28, hi = used.length ? Math.max(...used) + 1 : 40;
  const rows = Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
  const stepDur = (60 / a.grid.bpm) / 4;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Бас</h1>
        <div className="bar-nav">
          <button className="btn sm" disabled={currentBar === 0} onClick={() => setState({ currentBar: currentBar - 1 })}>◀</button>
          <b className="mono">Такт {currentBar + 1} / {nBars}</b>
          <button className="btn sm" disabled={currentBar >= nBars - 1} onClick={() => setState({ currentBar: currentBar + 1 })}>▶</button>
        </div>
        <span className="chip">{a.stems_model ? "из стема баса" : "из полного микса · приблизительно"}</span>
      </header>
      {a.bass.length === 0 ? (
        <section className="panel"><h2>Басовые ноты не найдены</h2><p>В басовом регистре ничего не найдено. Если в треке есть бас, скачай модель стемов в Настройках и проанализируй заново.</p></section>
      ) : (
        <>
          <section className="panel">
            <div className="roll">
              {rows.map((m) => (
                <div key={m} className={`roll-row ${[1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12) ? "black" : ""}`}>
                  <span className="roll-key">{noteName(m)}</span>
                  <div className="roll-lane">
                    {notes.filter((n) => n.midi === m).map((n, i) => (
                      <i key={i} className="roll-note" style={{ left: `${(n.step / 16) * 100}%`, width: `${Math.max(3, (n.duration / (stepDur * 16)) * 100)}%`, opacity: 0.45 + n.confidence * 0.55 }}
                        title={`${noteName(n.midi)} · шаг ${n.step + 1} · ${(n.confidence * 100).toFixed(0)}%`}>{noteName(n.midi)}</i>
                    ))}
                  </div>
                </div>
              ))}
              <div className="roll-axis">{Array.from({ length: 16 }, (_, i) => <span key={i} className={i % 4 === 0 ? "beat" : ""}>{String(i + 1).padStart(2, "0")}</span>)}</div>
            </div>
          </section>
          <section className="panel">
            <h2>Ноты в этом такте</h2>
            {notes.length === 0 ? <p className="hint">Тихий такт.</p> : (
              <table className="kv"><thead><tr><th>Нота</th><th>Шаг</th><th>Длина</th><th>Уверенность</th></tr></thead><tbody>
                {notes.map((n, i) => <tr key={i}><td className="mono">{noteName(n.midi)}</td><td className="mono">{n.step + 1}</td>
                  <td className="mono">{(n.duration * 1000).toFixed(0)} ms</td><td className={`mono ${n.confidence < 0.5 ? "warn" : ""}`}>{(n.confidence * 100).toFixed(0)}%</td></tr>)}
              </tbody></table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
