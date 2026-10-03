import { SectionStrip } from "../components/ArrangementStrip";
import { SECTION_LEGEND, mmss, sectionColor } from "../lib/sections";
import { playingSection, toggleSection } from "../lib/sectionPlay";
import { setState, useStore } from "../state/store";

export function Structure() {
  const { analysis: a, recipe, audioTag, stemPlaying } = useStore((s) => s);
  if (!a) return null;
  const playing = stemPlaying ? playingSection(audioTag) : null;
  const canPlay = !!a.stems.mix;
  return (
    <div className="screen">
      <header className="screen-head"><h1>Структура</h1>
        <span className="hint">Приблизительно — по энергии и плотности ударных. {canPlay ? "Нажми на блок — он заиграет по кругу." : ""}</span></header>
      <section className="panel" data-tour="struct">
        <h2>Порядок в треке</h2>
        <SectionStrip analysis={a} recipe={recipe} showPlay={canPlay} playingIndex={playing}
          onPick={(i) => canPlay && void toggleSection(a.sections[i], i)} height={84} />
        <div className="legend" style={{ marginTop: 12 }}>{SECTION_LEGEND.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>
      </section>
      <div className="cards">
        {a.sections.map((s, i) => {
          const pat = recipe?.arrangement[i]?.pattern;
          const steps = recipe?.patterns.find((p) => p.name === pat)?.steps;
          return (
            <div key={i} className={`card ${playing === i ? "playing" : ""}`} style={{ ["--c" as string]: sectionColor(s) }}>
              <div className="card-top"><b>{s.label}</b>{pat && <span className="chip solid">Паттерн {pat}</span>}</div>
              <div className="mono dim">{mmss(s.start)} – {mmss(s.end)} · такты {s.start_bar + 1}–{s.end_bar}</div>
              {steps && (
                <div className="mini-steps" aria-hidden>
                  {["KICK", "SNARE", "CLAP", "CLOSED_HAT"].map((v) => (
                    <div key={v} className="mini-row">{Array.from({ length: 16 }, (_, k) => <i key={k} className={steps[v]?.includes(k + 1) ? "on" : ""} data-v={v} />)}</div>
                  ))}
                </div>
              )}
              <div className="card-actions">
                <button className="btn sm primary" disabled={!canPlay} onClick={() => void toggleSection(s, i)}>{playing === i ? "■ Стоп" : "▶ Слушать"}</button>
                <button className="btn sm" title="Открыть ударные с первого такта этой секции" onClick={() => setState({ currentBar: s.start_bar, screen: "drums" })}>Провалиться ↓</button>
                <button className="btn sm" disabled={!pat} onClick={() => pat && setState({ activePattern: pat, screen: "recipe" })}>Паттерн</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
