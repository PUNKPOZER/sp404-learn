import { SP404PadGrid } from "../components/SP404PadGrid";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { tutorialGo } from "../state/actions";
import { setState, useStore } from "../state/store";
import { stopPlay } from "../lib/audio/preview";

const VOICES = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION", "BASS", "VOCAL"];

export function Tutorial() {
  const { tutorial: t, kit, playStep, course, recipe } = useStore((s) => s);
  if (!t) return null;
  const step = t.steps[t.index];
  const last = t.index === t.steps.length - 1;
  const cells: Record<string, Record<number, Cell>> = {};
  for (const [v, st] of Object.entries(step.grid)) for (const s of st) (cells[v] ??= {})[s] = { velocity: 0.8 };
  const voices = VOICES.filter((v) => cells[v] || v === step.voice || ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"].includes(v));
  const kitMap = t.mode === "course" && course ? Object.fromEntries(Object.entries(course.kit).map(([k, v]) => [Number(k), v.voice])) : kit;
  const exit = () => { stopPlay(); setState({ screen: t.mode === "course" ? "learn" : "recipe" }); };
  void recipe;
  return (
    <div className="screen tutorial">
      <header className="screen-head">
        <span className="chip">{step.lesson ? `LESSON ${String(step.lesson).padStart(2, "0")} / 18` : step.section}</span>
        <h1>{step.title}</h1>
        <div className="grow" />
        <span className="mono">{t.index + 1} / {t.steps.length}</span>
        <button className="btn sm" onClick={exit}>EXIT</button>
      </header>
      <div className="progress"><i style={{ width: `${((t.index + 1) / t.steps.length) * 100}%` }} /></div>
      <div className="tut-body">
        <div className="tut-pads">
          <SP404PadGrid kit={kitMap} highlighted={step.pad} />
          {step.pad && <p className="padcall mono">PAD {step.pad}</p>}
        </div>
        <div className="tut-seq">
          <StepSequencer voices={voices} cells={cells} readOnly playStep={playStep} highlight={step.highlight} focusVoice={step.voice} />
          {step.highlight.length > 0 && <p className="stepcall mono">STEPS {step.highlight.join(" / ")}</p>}
        </div>
      </div>
      <p className="lesson-text">{step.text}</p>
      <div className="tut-nav">
        <button className="btn big" disabled={t.index === 0} onClick={() => tutorialGo(-1)}>◀ BACK</button>
        {last ? <button className="btn acid big" onClick={exit}>DONE ✓</button> : <button className="btn acid big" onClick={() => tutorialGo(1)}>NEXT ▶</button>}
      </div>
    </div>
  );
}
