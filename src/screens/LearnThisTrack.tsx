import { useMemo } from "react";
import { ExplainCard } from "../components/ExplainCard";
import { byId } from "../content/load";
import { CORRECTABLE, genreName } from "../lib/genres";
import { buildLessonPlan, courseFor, type PlanItem } from "../lib/lessonPlan";
import { explainTrack } from "../lib/explain";
import { t } from "../lib/i18n";
import { doubleBpm, halveBpm, learnThisTrack, setGenreUser, setGrid, startLesson } from "../state/actions";
import { setState, useStore } from "../state/store";

const LV: Record<"high" | "medium" | "low", [string, string]> = { high: ["уверенно", "confident"], medium: ["скорее всего", "likely"], low: ["не уверен", "not sure"] };
const TYPE_LABEL: Record<PlanItem["type"], [string, string]> = { lesson: ["Урок", "Lesson"], trick: ["Приём", "Trick"], fx: ["Эффект", "FX"], exercise: ["Практика", "Practice"], track: ["Твой трек", "Your track"] };

/** LEARN THIS TRACK — "how could I build something like this on my SP-404?" from the analysis, the recipe and the library. */
export function LearnThisTrack() {
  const { analysis: a, recipe, minConfidence } = useStore((s) => s);
  const plan = useMemo(() => (a ? buildLessonPlan(a, recipe, minConfidence) : null), [a, recipe, minConfidence]);
  const cards = useMemo(() => (a ? explainTrack(a, minConfidence) : []), [a, minConfidence]);
  if (!a || !plan) return <div className="screen"><p className="hint">{t("Сначала открой трек.", "Open a track first.")}</p><button className="btn" onClick={() => setState({ screen: "tracklab" })}>Track Lab</button></div>;
  const open = (it: PlanItem) => {
    if (it.type === "lesson") startLesson(it.id, "learn");
    else if (it.type === "trick") setState({ screen: "trick", trickId: it.id });
    else if (it.type === "fx") setState({ screen: "fx", fxId: it.id });
    else if (it.type === "exercise") setState({ screen: "practice", practiceId: it.id });
    else learnThisTrack();
  };
  const course = courseFor(plan.genre);
  return (
    <div className="screen">
      <header className="screen-head"><h1>{t("Учить этот трек", "Learn this track")}</h1>
        <span className="hint">{t("Как собрать что-то подобное на SP-404 — а не как скопировать запись.", "How to build something like this on an SP-404 — not how to copy the recording.")}</span></header>

      <section className="panel plan-top">
        <div className="plan-facts">
          <div><span className="k">{t("СТИЛЬ", "STYLE")}</span><b className="plan-genre">{plan.genre ? plan.genreLabel : plan.options.length ? plan.options.slice(0, 2).map((o) => genreName(o.genre)).join(" / ") : t("не определён", "unknown")}</b>
            <span className="chip soft">{plan.genreSource === "user" ? t("твой выбор", "your choice") : plan.genreStatus === "confident" ? t("скорее всего", "likely") : t("неясно", "unclear")}</span></div>
          <div><span className="k">{t("ТЕМП", "TEMPO")}</span><b className="plan-genre">{plan.bpm.toFixed(plan.bpm % 1 ? 1 : 0)} BPM</b>
            <span className="chip soft">{t(...LV[plan.tempoLevel])}</span></div>
        </div>
        <div className="row plan-fix">
          <label className="inline">{t("Сменить жанр", "Change genre")}
            <select value={a.genre_user ?? ""} onChange={(e) => void setGenreUser(e.target.value || null)} aria-label={t("Сменить жанр", "Change genre")}>
              <option value="">{t("— как определено —", "— as detected —")}</option>
              {CORRECTABLE.map((id) => <option key={id} value={id}>{genreName(id)}</option>)}
            </select></label>
          {plan.options.length > 1 && plan.genreStatus !== "confident" && plan.genreSource !== "user" && plan.options.slice(0, 3).map((o) => (
            <button key={o.genre} className="btn sm" onClick={() => void setGenreUser(o.genre)}>{genreName(o.genre)} {Math.round(o.confidence * 100)}%</button>))}
          <span className="seg"><button className="btn sm" onClick={halveBpm}>÷2</button><button className="btn sm" onClick={doubleBpm}>×2</button>
            {plan.altBpm && <button className="btn sm primary" onClick={() => void setGrid({ bpm: plan.altBpm! })}>{plan.altBpm} BPM</button>}</span>
        </div>
        {plan.notes.map((n, i) => <p key={i} className="hint warn-note">⚠ {n}</p>)}
        {plan.needs.length > 0 && (
          <div className="plan-needs"><span className="k">{t("ТЕБЕ ПОНАДОБИТСЯ", "YOU WILL NEED")}</span>
            <ul>{plan.needs.map((n) => <li key={n.id}>{n.text}{n.level === "low" && <small className="dim"> · {t("примерно", "approx.")}</small>}</li>)}</ul></div>
        )}
      </section>

      <h2 className="plan-h">{t("План урока", "Lesson plan")}</h2>
      <ol className="plan-steps">
        {plan.steps.map((s) => (
          <li key={s.id} className={`plan-step lvl-${s.level}`}>
            <header><span className="n">{String(s.n).padStart(2, "0")}</span><h3>{s.title}</h3><span className="chip soft">{t(...LV[s.level])}</span></header>
            <p>{s.why}</p>
            {s.fromTrack && <p className="mono dim from-track">{t("Из твоего трека", "From your track")}: {s.fromTrack}</p>}
            {s.caution && <p className="hint warn-note">⚠ {s.caution}</p>}
            <div className="plan-items">
              {s.items.slice(0, 6).map((it) => (
                <button key={`${it.type}:${it.id}`} className={`btn sm ${it.type === "track" ? "primary" : ""}`} onClick={() => open(it)}>
                  <span className="dim">{t(...TYPE_LABEL[it.type])}</span> {it.title}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {course && byId(course.id) && <p className="hint">{t("Весь курс по жанру", "The whole genre course")}: <button className="link" onClick={() => setState({ screen: "courses" })}>{t("Курсы → Жанры: глубже", "Courses → Genre deep-dives")}</button></p>}

      <h2 className="plan-h">{t("Что нашёл анализ", "What the analysis found")}</h2>
      <div className="explain-grid">
        {cards.map((c) => <ExplainCard key={c.id} card={c} onAlt={(b) => void setGrid({ bpm: b })} onLearn={(l) => { if (l.type === "lesson") startLesson(l.id, "learn"); else setState({ screen: "courses" }); }} />)}
      </div>
    </div>
  );
}
