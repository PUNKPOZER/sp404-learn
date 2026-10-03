import { ArrangementStrip } from "../components/ArrangementStrip";
import { setState, useStore } from "../state/store";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const COL: Record<string, string> = { A: "#5ef2c0", B: "#5cc8ff", C: "#ffc15e", D: "#ff6fae" };

export function Structure() {
  const { analysis: a, recipe } = useStore((s) => s);
  if (!a) return null;
  return (
    <div className="screen">
      <header className="screen-head"><h1>Структура</h1><span className="hint">Приблизительно — по энергии и плотности ударных по тактам. Клик по блоку выбирает его паттерн.</span></header>
      <section className="panel"><h2>Порядок в треке</h2><ArrangementStrip analysis={a} recipe={recipe} /></section>
      <div className="cards">
        {a.sections.map((s, i) => {
          const pat = recipe?.arrangement[i]?.pattern;
          const steps = recipe?.patterns.find((p) => p.name === pat)?.steps;
          return (
            <div key={i} className="card" style={{ ["--c" as string]: pat ? COL[pat] : "#8b91a3" }}>
              <div className="card-top"><b>{s.label}</b><span className="chip solid">{pat ? `Паттерн ${pat}` : "—"}</span></div>
              <div className="mono dim">{fmt(s.start)} – {fmt(s.end)} · такты {s.start_bar + 1}–{s.end_bar}</div>
              {steps && (
                <div className="mini-steps" aria-hidden>
                  {["KICK", "SNARE", "CLAP", "CLOSED_HAT"].map((v) => (
                    <div key={v} className="mini-row">{Array.from({ length: 16 }, (_, k) => <i key={k} className={steps[v]?.includes(k + 1) ? "on" : ""} data-v={v} />)}</div>
                  ))}
                </div>
              )}
              <button className="btn sm" disabled={!pat} onClick={() => pat && setState({ activePattern: pat, screen: "recipe" })}>Открыть паттерн</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
