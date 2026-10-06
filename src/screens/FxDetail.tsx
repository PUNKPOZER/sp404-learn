import { Knob } from "../components/Knob";
import { SourceList } from "../components/SourceList";
import { DeviceDiagram } from "../components/DeviceDiagram";
import { FX } from "../content/fx";
import { startGuide } from "../state/actions";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";

export function FxDetail() {
  const id = useStore((s) => s.fxId);
  const e = FX.find((x) => x.id === id && x.status === "verified");
  if (!e) return <div className="screen"><p className="hint">{t("Такого эффекта нет.", "No such effect.")}</p><button className="btn" onClick={() => setState({ screen: "fxlab" })}>← FX Lab</button></div>;
  return (
    <div className="screen">
      <header className="screen-head">
        <button className="btn sm" onClick={() => setState({ screen: "fxlab" })}>← FX Lab</button>
        <h1>{e.name}</h1>{e.button && <span className="chip">[{e.button}]</span>}
        <div className="grow" />
        <button className="btn primary big" onClick={() => startGuide("fx", e.name, e.tryThis, "fx")}>{t("Попробовать →", "Try it →")}</button>
      </header>

      <section className="panel"><h2>{t("Что делает", "What it does")}</h2><p className="lead">{e.whatItDoes}</p></section>

      <section className="panel">
        <h2>{t("Параметры", "Parameters")} <small>{t("как в руководстве Roland", "as in the Roland manual")}</small></h2>
        <div className="fx-knobs">{e.params.slice(0, 3).map((p) => <Knob key={p.id} label={p.label} range={p.range} value={0.5} />)}</div>
        <table className="kv"><tbody>
          {e.params.map((p) => <tr key={p.id}><td className="mono"><b>{p.label}</b></td><td className="mono">{p.range ?? "—"}</td><td>{p.meaning}</td></tr>)}
        </tbody></table>
        <p className="hint">{t("Какая ручка CTRL отвечает за какой параметр, показывает дисплей прибора.", "The device display shows which CTRL knob controls which parameter.")}</p>
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>{t("Попробуй", "Try this")}</h2>
          <ol className="steps">{e.tryThis.map((s, i) => <li key={i}>{s.text}</li>)}</ol>
          <DeviceDiagram compact highlightControls={e.button ? [e.button] : []} display={e.name.toUpperCase()} />
        </section>
        <div className="stack">
          <section className="panel"><h2>{t("Для чего", "Use it for")}</h2><ul className="bullets">{e.useFor.map((u) => <li key={u}>{u}</li>)}</ul></section>
          {e.tip && <section className="panel"><h2>{t("Заметка", "Note")}</h2><p>{e.tip}</p></section>}
          {e.practice && <section className="panel"><h2>{t("Практика", "Practice")}</h2><p>{e.practice}</p></section>}
        </div>
      </div>
      <SourceList sources={e.sources} />
    </div>
  );
}
