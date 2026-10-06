import { FX } from "../content/fx";
import { PLANNED } from "../content/load";
import { verified } from "../content/types";
import { setState } from "../state/store";
import { t } from "../lib/i18n";

export function FxLab() {
  const items = verified(FX);
  const planned = PLANNED.fx.length;
  return (
    <div className="screen">
      <header className="screen-head"><h1>FX Lab</h1><span className="hint">{t("Эффекты SP-404MKII через короткие упражнения. Все описания сверены с официальным руководством Roland.", "SP-404MKII effects through short exercises. Every description is checked against Roland's official manual.")}</span></header>
      <div className="fx-grid" data-tour="fxlist">
        {items.map((e) => (
          <button key={e.id} className="fx-card" onClick={() => setState({ screen: "fx", fxId: e.id })}>
            <span className="chip">{e.button ?? "FX"}</span>
            <span className="fx-name">{e.name}</span>
            <span className="fx-sum">{e.whatItDoes}</span>
            <span className="mono dim">{e.params.length} {t("параметров", "parameters")} · {e.tryThis.length} {t("шагов", "steps")}</span>
          </button>
        ))}
      </div>
      {planned > 0 && <p className="hint">{t(`Остальные эффекты появятся после сверки с руководством (${planned} в плане).`, `The remaining effects will appear once checked against the manual (${planned} planned).`)}</p>}
    </div>
  );
}
