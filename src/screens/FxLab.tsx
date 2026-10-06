import { FX } from "../content/fx";
import { verified } from "../content/types";
import { setState } from "../state/store";

export function FxLab() {
  const items = verified(FX);
  const planned = FX.length - items.length;
  return (
    <div className="screen">
      <header className="screen-head"><h1>FX Lab</h1><span className="hint">Эффекты SP-404MKII через короткие упражнения. Все описания сверены с официальным руководством Roland.</span></header>
      <div className="fx-grid" data-tour="fxlist">
        {items.map((e) => (
          <button key={e.id} className="fx-card" onClick={() => setState({ screen: "fx", fxId: e.id })}>
            <span className="chip">{e.button ?? "FX"}</span>
            <span className="fx-name">{e.name}</span>
            <span className="fx-sum">{e.whatItDoes}</span>
            <span className="mono dim">{e.params.length} параметров · {e.tryThis.length} шагов</span>
          </button>
        ))}
      </div>
      {planned > 0 && <p className="hint">Остальные эффекты появятся после сверки с руководством ({planned} в плане).</p>}
    </div>
  );
}
