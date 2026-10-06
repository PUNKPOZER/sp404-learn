import { useState } from "react";
import { DifficultyBadge, DurationChip } from "../components/Chips";
import { PracticePanel } from "../components/PracticePanel";
import { byId, itemsOf, loc } from "../content/load";
import type { Exercise } from "../content/schema";
import { loadStats, saveStat, type Judgement } from "../lib/practice";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";

const ORDER = ["beginner", "intermediate", "advanced"];
export const exercises = () => itemsOf<Exercise>("exercise").sort((a, b) => ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty) || loc(a.title).localeCompare(loc(b.title)));

/** The list of exercises (a tab of Courses). */
export function PracticeList() {
  const [stats, setStats] = useState(loadStats);
  void setStats;
  return (
    <div className="fx-grid" data-tour="practice-list">
      {exercises().map((e) => {
        const st = stats[e.id];
        return (
          <button key={e.id} className="fx-card" onClick={() => setState({ screen: "practice", practiceId: e.id })}>
            <span className="row"><DifficultyBadge level={e.difficulty} /><DurationChip min={e.durationMin} /></span>
            <span className="fx-name">{loc(e.title)}</span>
            <span className="fx-sum">{loc(e.summary)}</span>
            <span className="mono dim">{e.practice.bpm} BPM · {st ? `${t("лучший", "best")} ${Math.round(st.best * 100)}% · ${st.runs} ${t("подх.", "runs")}` : t("ещё не играл", "not played yet")}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One exercise: instructions + the LISTEN → WATCH → COPY → PLAY panel. */
export function Practice() {
  const id = useStore((s) => s.practiceId);
  const back = useStore((s) => s.tutorial?.back);
  const item = id ? byId(id) : undefined;
  const [, force] = useState(0);
  if (!item || item.type !== "exercise") return <div className="screen"><p className="hint">{t("Такого упражнения нет.", "No such exercise.")}</p><button className="btn" onClick={() => setState({ screen: "courses" })}>← {t("Курсы", "Courses")}</button></div>;
  const onResult = (j: Judgement) => { saveStat(item.id, j); force((n) => n + 1); };
  return (
    <div className="screen">
      <header className="screen-head">
        <button className="btn sm" onClick={() => setState({ screen: back ?? "courses" })}>← {t("Назад", "Back")}</button>
        <h1>{loc(item.title)}</h1><DifficultyBadge level={item.difficulty} /><DurationChip min={item.durationMin} />
      </header>
      <p className="lead">{loc(item.summary)}</p>
      <PracticePanel spec={item.practice} onResult={onResult} />
      <details className="panel"><summary><b>{t("Как это работает", "How it works")}</b></summary>
        <ol className="steps">{item.instructions.map((s, i) => <li key={i}>{loc(s)}</li>)}</ol>
        <p className="hint">{t("Пока упражнения проверяются по экранным пэдам и клавиатуре. Подключение пэдов самого SP-404MKII по MIDI — в планах (HARDWARE_PRACTICE_PLAN.md) и не включено.", "For now exercises are checked against the on-screen pads and the keyboard. Using the SP-404MKII's own pads over MIDI is planned (HARDWARE_PRACTICE_PLAN.md) and not enabled.")}</p>
      </details>
    </div>
  );
}
