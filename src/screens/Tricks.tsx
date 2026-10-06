import { PLANNED_TOPICS, TRICKS } from "../content/tricks";
import { verified } from "../content/types";
import { setState } from "../state/store";
import { t as tx } from "../lib/i18n";

export function Tricks() {
  const items = verified(TRICKS);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Tricks</h1><span className="hint">{tx("Короткие приёмы — намного короче курсов. Каждый проверен по официальному руководству Roland.", "Short techniques — much shorter than courses. Each one is checked against Roland's official manual.")}</span></header>
      <div className="fx-grid" data-tour="tricklist">
        {items.map((t) => (
          <button key={t.id} className="fx-card" onClick={() => setState({ screen: "trick", trickId: t.id })}>
            <span className="chip">{t.topic}</span>
            <span className="fx-name">{t.title}</span>
            <span className="fx-sum">{t.summary}</span>
            <span className="mono dim">{t.steps.length} {tx("шагов", "steps")}</span>
          </button>
        ))}
      </div>
      <p className="hint">{tx("В плане", "Planned")}: {PLANNED_TOPICS.join(", ")}. {tx("Они появятся после проверки по руководству.", "They will appear once checked against the manual.")}</p>
    </div>
  );
}
