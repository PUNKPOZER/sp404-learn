import { useState } from "react";
import { DeviceDiagram } from "../components/DeviceDiagram";
import { SourceList } from "../components/SourceList";
import { TRICKS } from "../content/tricks";
import { startGuide } from "../state/actions";
import { setState, useStore } from "../state/store";

export function TrickDetail() {
  const id = useStore((s) => s.trickId);
  const t = TRICKS.find((x) => x.id === id && x.status === "verified");
  const [i, setI] = useState(0);
  if (!t) return <div className="screen"><p className="hint">Такого приёма нет.</p><button className="btn" onClick={() => setState({ screen: "tricks" })}>← Tricks</button></div>;
  const step = t.steps[Math.min(i, t.steps.length - 1)];
  return (
    <div className="screen">
      <header className="screen-head">
        <button className="btn sm" onClick={() => setState({ screen: "tricks" })}>← Tricks</button>
        <h1>{t.title}</h1>
        <div className="grow" />
        <button className="btn primary big" onClick={() => startGuide("trick", t.title, t.steps, "trick")}>Пройти по шагам →</button>
      </header>
      <p className="lead">{t.summary}</p>
      <div className="grid2">
        <section className="panel">
          <h2>Шаги <small>нажми на шаг — он подсветится на схеме</small></h2>
          <ol className="steps clickable">
            {t.steps.map((s, k) => (
              <li key={k} className={k === i ? "cur" : ""}><button onClick={() => setI(k)} aria-current={k === i}>{s.text}</button></li>
            ))}
          </ol>
        </section>
        <section className="panel">
          <DeviceDiagram compact highlightControls={step.controls} highlightPads={step.pads} />
        </section>
      </div>
      {t.notes && <section className="panel"><h2>Важно</h2><ul className="bullets">{t.notes.map((n) => <li key={n}>{n}</li>)}</ul></section>}
      <SourceList sources={t.sources} />
    </div>
  );
}
