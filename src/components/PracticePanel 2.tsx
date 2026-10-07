import { useEffect, useMemo, useRef, useState } from "react";
import { PadGrid } from "./SP404PadGrid";
import { StepSequencer, type Cell } from "./StepSequencer";
import { PracticeEngine } from "../lib/audio/practice";
import { PHASES, VISIBILITIES, hiddenFraction, judge, keyboardInput, padOfVoice, padToKey, rowText, visibleSteps, type Hit, type Judgement, type Phase, type Spec, type Visibility } from "../lib/practice";
import { DEFAULT_KIT, VOICE_LABELS } from "../lib/voices";
import { t } from "../lib/i18n";

const PHASE_TEXT: Record<Phase, [string, string, string, string]> = {
  listen: ["СЛУШАЙ", "LISTEN", "Послушай паттерн, ничего не нажимая.", "Hear the pattern without touching anything."],
  watch: ["СМОТРИ", "WATCH", "Паттерн играет, шаги подсвечиваются в такт.", "The pattern plays and the steps light up in time."],
  copy: ["ПОВТОРЯЙ", "COPY", "Паттерн виден и играет — подыграй пэдами.", "The pattern is visible and plays — play along on the pads."],
  play: ["ИГРАЙ", "PLAY", "Паттерн не звучит — играй сам по метроному.", "The pattern is silent — play it yourself to the click."],
};
const VIS_TEXT: Record<Visibility, [string, string]> = { show: ["ВСЁ ВИДНО", "SHOW ALL"], hide: ["БЕЗ ШАГОВ", "HIDE STEPS"], memory: ["ПАМЯТЬ", "MEMORY"] };

/** LISTEN → WATCH → COPY → PLAY over one pattern. Pointer and keyboard input only (MIDI is a documented plan). */
export function PracticePanel({ spec, onResult, kit = DEFAULT_KIT }: { spec: Spec; onResult?: (j: Judgement) => void; kit?: Record<number, string> }) {
  const engine = useRef(new PracticeEngine());
  const [phase, setPhase] = useState<Phase>("listen");
  const [vis, setVis] = useState<Visibility>("show");
  const [round, setRound] = useState(0);
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [countIn, setCountIn] = useState(0);
  const [result, setResult] = useState<Judgement | null>(null);
  const [sound, setSound] = useState(true);
  const bars = spec.bars ?? 2;
  const voices = Object.keys(spec.voices);

  const frac = hiddenFraction(vis, phase, round);
  const shown = useMemo(() => Object.fromEntries(voices.map((v) => [v, visibleSteps(spec.voices[v], frac)])), [spec, frac]);   // eslint-disable-line react-hooks/exhaustive-deps
  const hiddenNow = frac > 0 && running !== undefined;

  const run = (p: Phase) => {
    setPhase(p); setResult(null); setCursor(-1);
    setRunning(true);
    engine.current.start({
      spec, phase: p, bars, audiblePattern: p !== "play" && (p !== "copy" || sound), click: p !== "listen",
      onStep: (s, _b, ci) => { setCursor(s); setCountIn(ci); },
      onDone: (hits: Hit[], stepMs: number) => {
        setRunning(false); setCursor(-1);
        if (p === "copy" || p === "play") {
          const j = judge(spec.voices, hits, bars, stepMs);
          setResult(j); onResult?.(j);
          if (p === "play" && vis === "memory" && j.passed) setRound((r) => Math.min(3, r + 1));
        }
      },
    });
  };
  const stop = () => { engine.current.stop(); setRunning(false); setCursor(-1); };
  useEffect(() => () => engine.current.stop(false), []);
  useEffect(() => {
    const off = keyboardInput.start((h) => { if (h.pad != null) { const v = kit[h.pad]; if (v) engine.current.hit(v); } });
    return off;
  }, [kit]);

  const cells: Record<string, Record<number, Cell>> = {};
  for (const v of voices) for (const s of shown[v]) (cells[v] ??= {})[s] = { velocity: 0.85 };
  const cue = cursor >= 0 && phase !== "play" ? voices.filter((v) => spec.voices[v].includes(cursor + 1)).map((v) => padOfVoice(v, kit)).filter((p): p is number => p != null) : [];
  const labels: Record<number, string> = {};
  for (let p = 1; p <= 16; p++) if (kit[p]) labels[p] = `${VOICE_LABELS[kit[p]] ?? kit[p]} · ${padToKey(p)}`;
  const kitUsed = Object.fromEntries(Object.entries(kit).filter(([, v]) => voices.includes(v)));

  return (
    <div className="practice">
      <div className="practice-bar">
        <div className="seg" role="tablist" aria-label={t("Этапы", "Stages")}>
          {PHASES.map((p, i) => (
            <button key={p} role="tab" aria-selected={phase === p} className={`btn ${phase === p ? "on" : ""}`} onClick={() => { stop(); setPhase(p); setResult(null); }}>
              <span className="mono">{i + 1}</span> {t(PHASE_TEXT[p][0], PHASE_TEXT[p][1])}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label={t("Что показывать", "What to show")}>
          {VISIBILITIES.map((v) => <button key={v} className={`btn sm ${vis === v ? "on" : ""}`} aria-pressed={vis === v} onClick={() => { setVis(v); setRound(0); setResult(null); }}>{t(VIS_TEXT[v][0], VIS_TEXT[v][1])}</button>)}
        </div>
      </div>
      <p className="hint">{t(PHASE_TEXT[phase][2], PHASE_TEXT[phase][3])} · {spec.bpm} BPM · {bars} {t("такта", "bars")}{vis === "memory" && phase === "play" ? ` · ${t("скрыто", "hidden")} ${Math.round(frac * 100)}%` : ""}</p>

      <div className="practice-rows" aria-label={t("Паттерн", "Pattern")}>
        {voices.map((v) => (
          <div key={v} className="practice-row">
            <span className="mono pr-label">{VOICE_LABELS[v] ?? v}</span>
            <code className="pr-text" aria-label={hiddenNow && shown[v].length < spec.voices[v].length ? t("скрыто", "hidden") : rowText(spec.voices[v])}>
              {rowText(shown[v])}{shown[v].length < spec.voices[v].length ? " …" : ""}
            </code>
          </div>
        ))}
      </div>
      <StepSequencer voices={voices} cells={cells} readOnly compact playStep={cursor} />

      <div className="practice-pads">
        <PadGrid kit={kitUsed} labels={labels} highlighted={cue} onPad={(p) => { const v = kit[p]; if (v) engine.current.hit(v); }} />
        <div className="practice-side">
          {countIn > 0 && <div className="countin mono" aria-live="assertive">{Math.ceil(countIn / 4)}</div>}
          {running ? <button className="btn big" onClick={stop}>■ {t("Стоп", "Stop")}</button> : <button className="btn primary big" onClick={() => run(phase)}>▶ {t(PHASE_TEXT[phase][0], PHASE_TEXT[phase][1])}</button>}
          {phase === "copy" && <label className="inline"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> {t("паттерн звучит", "pattern sounds")}</label>}
          <span className="hint">{t("Клавиши как на приборе: Z X C V — пэды 1–4, A S D F — 5–8, Q W E R — 9–12, 1 2 3 4 — 13–16.", "Keys as on the unit: Z X C V = pads 1–4, A S D F = 5–8, Q W E R = 9–12, 1 2 3 4 = 13–16.")}</span>
        </div>
      </div>

      {result && (
        <section className={`panel practice-result ${result.passed ? "ok" : ""}`} aria-live="polite">
          <h2>{result.passed ? t("Есть! ✓", "Got it ✓") : t("Ещё раз", "Again")} <small>{Math.round(result.score * 100)}%</small></h2>
          <p>{t("Попал", "Hit")} <b>{result.matched}</b> {t("из", "of")} <b>{result.expected}</b> · {t("лишних нажатий", "extra taps")} <b>{result.extra}</b>
            {result.matched > 0 && <> · {t("в среднем", "on average")} <b>{Math.abs(Math.round(result.meanOffsetMs))} {t("мс", "ms")}</b> {result.meanOffsetMs > 8 ? t("позже", "late") : result.meanOffsetMs < -8 ? t("раньше", "early") : t("— точно в долю", "— right on the beat")}</>}</p>
          {result.missed.length > 0 && <p className="hint">{t("Пропущено", "Missed")}: {result.missed.map((m) => `${VOICE_LABELS[m.voice] ?? m.voice} ${m.step}`).join(", ")}</p>}
          {result.passed && vis === "memory" && round < 3 && <p className="hint">{t("Следующий раунд скроет больше шагов.", "The next round hides more steps.")}</p>}
        </section>
      )}
    </div>
  );
}
