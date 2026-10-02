import { ArrangementStrip } from "../components/ArrangementStrip";
import { SP404PadGrid } from "../components/SP404PadGrid";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { learnThisTrack, resetPattern, setPatternStep } from "../state/actions";
import { setState, useStore } from "../state/store";
import { padOf } from "../lib/kit";
import { DRUM_ROWS, VOICE_LABELS, noteName } from "../lib/voices";

const ROWS = [...DRUM_ROWS, "BASS"];

export function Recipe() {
  const { recipe, kit, activePattern, selectedPad, playStep, patternEdits, analysis } = useStore((s) => s);
  if (!recipe || !analysis) return <div className="screen"><p className="hint">Building recipe…</p></div>;
  const pat = recipe.patterns.find((p) => p.name === activePattern) ?? recipe.patterns[0];
  const bassNotes = pat.notes?.BASS ?? {};
  const cells: Record<string, Record<number, Cell>> = {};
  for (const [v, steps] of Object.entries(pat.steps))
    for (const s of steps) (cells[v] ??= {})[s] = { velocity: 0.85, label: v === "BASS" && bassNotes[s] != null ? noteName(bassNotes[s]) : undefined };
  const used = Object.entries(pat.steps).filter(([, st]) => st.length).map(([v]) => padOf(v, kit)).filter((x): x is number => x != null);
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>SP Recipe</h1>
        <span className="chip">{recipe.bpm} BPM</span>
        <div className="grow" />
        <button className="btn primary big" onClick={learnThisTrack}>Learn this track ▸</button>
      </header>
      <section className="panel"><h2>Song order</h2><ArrangementStrip analysis={analysis} recipe={recipe} /></section>
      <section className="panel">
        <div className="tabs">
          {recipe.patterns.map((p) => (
            <button key={p.name} className={`btn tab ${p.name === pat.name ? "on" : ""}`} onClick={() => setState({ activePattern: p.name })}>
              Pattern {p.name}{p.edited || patternEdits[p.name] ? " ✎" : ""}<small>{p.label}</small></button>
          ))}
          <div className="grow" />
          {patternEdits[pat.name] && <button className="btn sm" onClick={() => resetPattern(pat.name)}>Reset edits</button>}
        </div>
        <StepSequencer voices={ROWS} cells={cells} playStep={playStep} onToggle={(v, s) => setPatternStep(pat.name, v, s)} onSelect={() => {}} />
        <p className="hint">Click any cell to toggle it — the preview and the lessons follow.{pat.source_bars ? ` Built from ${pat.source_bars} bar(s) of “${pat.label}”.` : ""}</p>
      </section>
      <div className="grid2">
        <section className="panel">
          <h2>Kit <small>click a pad to remap</small></h2>
          <SP404PadGrid kit={kit} selected={selectedPad} active={used} onPad={(p) => setState({ selectedPad: p })} />
        </section>
        <section className="panel">
          <h2>What goes where</h2>
          <table className="kv"><tbody>
            {ROWS.filter((v) => pat.steps[v]?.length).map((v) => (
              <tr key={v}><td><span className="dot" style={{ background: `var(--v-${v})` }} />{VOICE_LABELS[v]}</td><td className="mono">PAD {padOf(v, kit) ?? "—"}</td>
                <td className="mono">{v === "BASS" && pat.notes?.BASS ? pat.steps[v].map((s) => `${s}·${noteName(bassNotes[s])}`).join("  ") : pat.steps[v].join(" / ")}</td></tr>
            ))}
          </tbody></table>
          {recipe.notes.map((n, i) => <p key={i} className="note">{n}</p>)}
        </section>
      </div>
    </div>
  );
}
