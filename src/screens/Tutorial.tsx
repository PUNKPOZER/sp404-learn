import { DeviceDiagram } from "../components/DeviceDiagram";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { GenreArt } from "../components/GenreArt";
import { tutorialGo } from "../state/actions";
import { setState, useStore } from "../state/store";
import { stopPlay } from "../lib/audio/preview";
import type { TutorialStep } from "../lib/types";

const VOICES = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION", "BASS", "VOCAL", "CHOP", "TEXTURE", "FX"];
const CORE = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"];
const groupKey = (s: TutorialStep) => String(s.lesson ?? s.section);

/** Lesson view: course / lesson / progress, the step list, a simplified SP-404MKII diagram that lights the pads and controls
 *  the current step talks about, the step grid, and one clear NEXT. Used by courses, track tutorials, FX Lab and Tricks. */
export function Tutorial() {
  const { tutorial: t, kit, playStep, course } = useStore((s) => s);
  if (!t) return null;
  const step = t.steps[t.index];
  const last = t.index === t.steps.length - 1;
  const group = t.steps.map((s, i) => ({ s, i })).filter(({ s }) => groupKey(s) === groupKey(step));
  const cells: Record<string, Record<number, Cell>> = {};
  for (const [v, st] of Object.entries(step.grid)) for (const s of st) (cells[v] ??= {})[s] = { velocity: 0.85 };
  const voices = VOICES.filter((v) => cells[v] || v === step.voice || CORE.includes(v));
  const hasGrid = Object.keys(step.grid).length > 0 || step.highlight.length > 0;
  const kitMap = t.mode === "course" && course ? Object.fromEntries(Object.entries(course.kit).map(([k, v]) => [Number(k), v.voice])) : kit;
  // in TR-REC the 16 pads ARE the 16 steps, so while placing steps the pads show their step numbers instead of instrument names
  const stepPads = step.highlight.length > 0;
  const hlPads = step.pads?.length ? step.pads : stepPads ? step.highlight : step.pad ? [step.pad] : [];
  const back = t.back ?? "home";
  const exit = () => { stopPlay(); setState({ screen: back }); };
  const total = t.steps.length;
  const showTransport = hasGrid;
  void showTransport;
  return (
    <div className="screen lesson">
      <header className="lesson-head">
        <button className="btn sm" onClick={exit}>← Выйти</button>
        {t.mode === "course" && t.courseId && <GenreArt id={t.courseId} className="lesson-art" />}
        <div className="lesson-titles">
          <span className="k">{step.lesson ? `${t.title} · урок ${String(step.lesson).padStart(2, "0")} / ${String(step.lessonsTotal ?? "").padStart(2, "0")}` : t.mode === "fx" || t.mode === "trick" ? `Шаг ${t.index + 1} из ${total}` : `${t.title} · ${step.section}`}</span>
          <h1>{step.lessonTitle ?? (t.mode === "fx" || t.mode === "trick" ? t.title : step.title)}</h1>
        </div>
        <div className="grow" />
        <span className="mono" aria-live="polite">{t.index + 1} / {total}</span>
      </header>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={t.index + 1} aria-label="Прогресс"><i style={{ width: `${((t.index + 1) / total) * 100}%` }} /></div>

      <div className="lesson-body">
        <ol className="step-list" aria-label="Шаги урока">
          {group.map(({ s, i }) => (
            <li key={i} className={i === t.index ? "cur" : i < t.index ? "done" : ""}>
              <button onClick={() => tutorialGo(i - t.index)} aria-current={i === t.index ? "step" : undefined}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span><span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="lesson-main">
          <h2 className="step-title">{step.title}</h2>
          <p className="lesson-text">{step.text}</p>
          {step.highlight.length > 0 && <p className="stepcall mono">Пэды-шаги {step.highlight.join(" / ")}</p>}
          {step.pad && !stepPads && <p className="padcall mono">Пэд {step.pad}</p>}
        </div>

        <div className="lesson-visual">
          <DeviceDiagram highlightPads={hlPads} highlightControls={step.controls ?? []} kit={stepPads ? {} : kitMap} display={t.mode === "fx" ? t.title.toUpperCase() : "SP-404MKII"} />
          {hasGrid && (
            <div className="lesson-grid">
              <StepSequencer voices={voices} cells={cells} readOnly playStep={playStep} highlight={step.highlight} focusVoice={step.voice} />
            </div>
          )}
        </div>
      </div>

      <div className="tut-nav">
        <button className="btn big" disabled={t.index === 0} onClick={() => tutorialGo(-1)}>← Назад</button>
        {last ? <button className="btn primary big" onClick={exit}>Готово ✓</button> : <button className="btn primary big" onClick={() => tutorialGo(1)}>Далее →</button>}
      </div>
    </div>
  );
}
