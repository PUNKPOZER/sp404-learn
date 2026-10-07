import { useState } from "react";
import { DeviceDiagram } from "../components/DeviceDiagram";
import { SourceList } from "../components/SourceList";
import { TRICKS } from "../content/tricks";
import { startGuide } from "../state/actions";
import { setState, useStore } from "../state/store";
import { t as tx } from "../lib/i18n";

export function TrickDetail() {
  const id = useStore((s) => s.trickId);
  const t = TRICKS.find((x) => x.id === id && x.status === "verified");
  const [i, setI] = useState(0);
  if (!t) return <div className="screen"><p className="hint">{tx("Такого приёма нет.", "No such trick.")}</p><button className="btn" onClick={() => setState({ screen: "tricks" })}>← Tricks</button></div>;
  const step = t.steps[Math.min(i, t.steps.length - 1)];
  return (
    <div className="screen">
      <header className="screen-head">
        <button className="btn sm" onClick={() => setState({ screen: "tricks" })}>← Tricks</button>
        <h1>{t.title}</h1>
        <div className="grow" />
        <button className="btn primary big" onClick={() => startGuide("trick", t.title, t.steps, "trick")}>{tx("Пройти по шагам →", "Go through the steps →")}</button>
      </header>
      <p className="lead">{t.summary}</p>
      <div className="grid2">
        <section className="panel">
          <h2>{tx("Шаги", "Steps")} <small>{tx("нажми на шаг — он подсветится на схеме", "click a step to highlight it on the diagram")}</small></h2>
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
      {t.notes && <section className="panel"><h2>{tx("Важно", "Important")}</h2><ul className="bullets">{t.notes.map((n) => <li key={n}>{n}</li>)}</ul></section>}
      <SourceList sources={t.sources} />
    </div>
  );
}
