import { PLANNED_TOPICS, TRICKS } from "../content/tricks";
import { verified } from "../content/types";
import { setState } from "../state/store";

export function Tricks() {
  const items = verified(TRICKS);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Tricks</h1><span className="hint">Короткие приёмы — намного короче курсов. Каждый проверен по официальному руководству Roland.</span></header>
      <div className="fx-grid" data-tour="tricklist">
        {items.map((t) => (
          <button key={t.id} className="fx-card" onClick={() => setState({ screen: "trick", trickId: t.id })}>
            <span className="chip">{t.topic}</span>
            <span className="fx-name">{t.title}</span>
            <span className="fx-sum">{t.summary}</span>
            <span className="mono dim">{t.steps.length} шагов</span>
          </button>
        ))}
      </div>
      <p className="hint">В плане: {PLANNED_TOPICS.join(", ")}. Они появятся после проверки по руководству.</p>
    </div>
  );
}
