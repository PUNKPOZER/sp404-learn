import { SectionStrip } from "../components/ArrangementStrip";
import { SP404PadGrid } from "../components/SP404PadGrid";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { learnThisTrack, resetPattern, setPadVoice, setPatternStep } from "../state/actions";
import { setState, useStore } from "../state/store";
import { padOf } from "../lib/kit";
import { mmss } from "../lib/sections";
import { ALL_VOICES, DRUM_ROWS, VOICE_COLORS, VOICE_LABELS, noteName } from "../lib/voices";

const ROWS = [...DRUM_ROWS, "BASS"];

export function Recipe() {
  const { recipe, kit, activePattern, selectedPad, playStep, patternEdits, analysis } = useStore((s) => s);
  if (!recipe || !analysis) return <div className="screen"><p className="hint">Собираю рецепт…</p></div>;
  const pat = recipe.patterns.find((p) => p.name === activePattern) ?? recipe.patterns[0];
  const bassNotes = pat.notes?.BASS ?? {};
  const cells: Record<string, Record<number, Cell>> = {};
  for (const [v, steps] of Object.entries(pat.steps))
    for (const s of steps) (cells[v] ??= {})[s] = { velocity: 0.85, label: v === "BASS" && bassNotes[s] != null ? noteName(bassNotes[s]) : undefined };
  const usedVoices = ROWS.filter((v) => pat.steps[v]?.length);
  const used = usedVoices.map((v) => padOf(v, kit)).filter((x): x is number => x != null);
  const where = recipe.arrangement.map((a, i) => ({ a, s: analysis.sections[i] })).filter((x) => x.a.pattern === pat.name && x.s);
  const padVoice = selectedPad != null ? kit[selectedPad] : null;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Рецепт SP</h1>
        <span className="chip">{recipe.bpm} BPM</span>
        <div className="grow" />
        <button className="btn primary big" onClick={learnThisTrack} data-tour="learn-track">Учить этот трек ▸</button>
      </header>
      <section className="panel">
        <h2>Где звучит паттерн {pat.name} <small>выбери паттерн ниже — подсветятся его секции</small></h2>
        <SectionStrip analysis={analysis} recipe={recipe} activePattern={pat.name} onPick={(i) => { const p = recipe.arrangement[i]?.pattern; if (p) setState({ activePattern: p }); }} />
        <p className="hint">{where.length ? `Паттерн ${pat.name}: ${where.map((x) => `${x.s.label} (${mmss(x.s.start)}–${mmss(x.s.end)})`).join(", ")}.` : "Этот паттерн не привязан к секциям."}</p>
      </section>
      <section className="panel" data-tour="pattern">
        <div className="tabs">
          {recipe.patterns.map((p) => (
            <button key={p.name} className={`btn tab ${p.name === pat.name ? "on" : ""}`} onClick={() => setState({ activePattern: p.name })}>
              Паттерн {p.name}{p.edited || patternEdits[p.name] ? " ✎" : ""}<small>{p.label}</small></button>
          ))}
          <div className="grow" />
          {patternEdits[pat.name] && <button className="btn sm" onClick={() => resetPattern(pat.name)}>Сбросить правки</button>}
        </div>
        <StepSequencer voices={ROWS} cells={cells} playStep={playStep} onToggle={(v, s) => setPatternStep(pat.name, v, s)} onSelect={() => {}} />
        <p className="hint">Клик по клетке включает/выключает шаг. Кнопка «Играть» внизу проигрывает этот паттерн по кругу.{pat.source_bars ? ` Собран из тактов: ${pat.source_bars} («${pat.label}»).` : ""}</p>
      </section>
      <div className="grid2">
        <section className="panel" data-tour="kit">
          <h2>Кит — где что лежит на SP</h2>
          <SP404PadGrid kit={kit} selected={selectedPad} active={used} onPad={(p) => setState({ selectedPad: p })} />
          <p className="legend-line"><i className="swatch" /> цветная рамка — пэд используется в паттерне {pat.name}</p>
          <div className="pad-edit">
            {selectedPad == null ? <p className="hint" style={{ margin: 0 }}>Нажми на пэд, чтобы выбрать, какой инструмент на нём лежит.</p> : (
              <>
                <span className="k">ПЭД {selectedPad}</span>
                <select value={padVoice ?? ""} onChange={(e) => setPadVoice(selectedPad, e.target.value)}>
                  {ALL_VOICES.map((v) => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}
                </select>
                {padVoice && pat.steps[padVoice]?.length ? <span className="chip">играет в паттерне {pat.name}</span> : <span className="chip soft">в паттерне {pat.name} не используется</span>}
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Что куда</h2>
          <table className="kv"><tbody>
            {usedVoices.map((v) => (
              <tr key={v}><td><span className="dot" style={{ background: VOICE_COLORS[v] }} />{VOICE_LABELS[v]}</td>
                <td className="mono">{padOf(v, kit) != null ? `ПЭД ${padOf(v, kit)}` : "нет пэда!"}</td>
                <td className="mono">{v === "BASS" && pat.notes?.BASS ? pat.steps[v].map((s) => `${s}·${noteName(bassNotes[s])}`).join("  ") : pat.steps[v].join(" / ")}</td></tr>
            ))}
          </tbody></table>
          {usedVoices.some((v) => padOf(v, kit) == null) && <p className="note">У некоторых инструментов паттерна нет пэда — назначь им пэд в ките, иначе урок не сможет показать, куда класть сэмпл.</p>}
          {recipe.notes.map((n, i) => <p key={i} className="note">{n}</p>)}
        </section>
      </div>
    </div>
  );
}
