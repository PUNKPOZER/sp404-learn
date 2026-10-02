import { SP404PadGrid } from "../components/SP404PadGrid";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { learnThisTrack, resetPattern, setPatternStep } from "../state/actions";
import { setState, useStore } from "../state/store";
import { padOf } from "../lib/kit";
import { DRUM_ROWS, VOICE_LABELS } from "../lib/voices";

export function Recipe() {
  const { recipe, kit, activePattern, selectedPad, playStep, patternEdits } = useStore((s) => s);
  if (!recipe) return <div className="screen"><p className="hint">Building recipe…</p></div>;
  const pat = recipe.patterns.find((p) => p.name === activePattern) ?? recipe.patterns[0];
  const cells: Record<string, Record<number, Cell>> = {};
  for (const [v, steps] of Object.entries(pat.steps)) for (const s of steps) (cells[v] ??= {})[s] = { velocity: 0.8 };
  const used = Object.entries(pat.steps).filter(([, st]) => st.length).map(([v]) => padOf(v, kit)).filter((x): x is number => x != null);
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>SP RECIPE</h1>
        <span className="mono dim">{recipe.bpm} BPM</span>
        <div className="grow" />
        <button className="btn acid big" onClick={learnThisTrack}>LEARN THIS TRACK ▸</button>
      </header>
      <div className="recipe-grid">
        <section className="panel">
          <h2>KIT <small>click a pad to remap</small></h2>
          <SP404PadGrid kit={kit} selected={selectedPad} active={used} onPad={(p) => setState({ selectedPad: p })} />
        </section>
        <section className="panel wide">
          <div className="tabs">
            {recipe.patterns.map((p) => (
              <button key={p.name} className={`btn ${p.name === pat.name ? "on" : ""}`} onClick={() => setState({ activePattern: p.name })}>
                PATTERN {p.name}{p.edited || patternEdits[p.name] ? " ✎" : ""}</button>
            ))}
            {patternEdits[pat.name] && <button className="btn sm" onClick={() => resetPattern(pat.name)}>RESET EDITS</button>}
          </div>
          <StepSequencer voices={DRUM_ROWS} cells={cells} playStep={playStep}
            onToggle={(v, s) => setPatternStep(pat.name, v, s)} onSelect={() => {}}
            onMenu={() => {}} />
          <p className="hint">Click any cell to toggle it — the preview and the lessons follow. {pat.source_bars ? `Built from ${pat.source_bars} bar(s) of “${pat.label}”.` : ""}</p>
          <table className="kv"><tbody>
            {DRUM_ROWS.filter((v) => pat.steps[v]?.length).map((v) => (
              <tr key={v}><td>{VOICE_LABELS[v]}</td><td className="mono">PAD {padOf(v, kit) ?? "—"}</td><td className="mono">{pat.steps[v].join(" / ")}</td></tr>
            ))}
          </tbody></table>
        </section>
      </div>
      {recipe.notes.length > 0 && <section className="panel warnbox">{recipe.notes.map((n, i) => <p key={i}>{n}</p>)}</section>}
    </div>
  );
}
