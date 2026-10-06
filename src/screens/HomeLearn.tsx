import { useEffect } from "react";
import { CourseCard } from "../components/CourseCard";
import { GenreArt } from "../components/GenreArt";
import { latest, percent } from "../lib/progress";
import { loadCourses, startCourse } from "../state/actions";
import { setState, useStore } from "../state/store";

const AREAS = [
  { screen: "fxlab" as const, title: "FX Lab", text: "Эффекты SP-404MKII: что делают и как попробовать." },
  { screen: "tricks" as const, title: "Tricks", text: "Короткие приёмы: skip back, mute group, TR-REC…" },
  { screen: "tracklab" as const, title: "Track Lab", text: "Разбери свой трек: темп, стемы, ударные, бас, рецепт." },
  { screen: "reference" as const, title: "Reference", text: "Короткие ответы: кнопки, понятия, сочетания." },
];

/** Calm learning dashboard: one thing to continue, then the way into everything else. */
export function HomeLearn() {
  const { courseList, progress } = useStore((s) => s);
  useEffect(() => { void loadCourses(); }, []);
  const last = latest(progress);
  const current = courseList.find((c) => c.id === last?.courseId) ?? (last ? undefined : courseList[0]);
  const prog = current ? progress[current.id] : undefined;
  return (
    <div className="screen home-learn">
      <header className="screen-head"><h1>Учись на SP-404MKII</h1><span className="chip soft">для SP-404MKII</span></header>

      {current && (
        <section className="continue" data-tour="continue" aria-label="Продолжить обучение">
          <GenreArt id={current.id} className="continue-art" />
          <div className="continue-body">
            <span className="k">{prog ? "Продолжить обучение" : "Начни здесь"}</span>
            <h2 className="continue-title">{current.title}</h2>
            <p className="continue-lesson">
              {prog ? <>Урок {String(prog.lesson).padStart(2, "0")} · {prog.lessonTitle}</> : current.short}
            </p>
            {prog && (
              <div className="continue-progress">
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(prog)} aria-label="Прогресс курса"><i style={{ width: `${percent(prog)}%` }} /></div>
                <b className="mono">{percent(prog)}%</b>
              </div>
            )}
            <div className="row"><button className="btn primary big" onClick={() => void startCourse(current.id, true)}>{prog ? "Продолжить →" : "Начать →"}</button></div>
          </div>
        </section>
      )}

      <section aria-label="Курсы">
        <div className="section-head"><h3>Курсы</h3><button className="link" onClick={() => setState({ screen: "courses" })}>все курсы</button></div>
        <div className="course-grid">
          {courseList.map((c) => <CourseCard key={c.id} course={c} progress={progress[c.id]} onOpen={() => void startCourse(c.id, true)} />)}
        </div>
      </section>

      <section aria-label="Разделы" data-tour="areas">
        <h3>Практика и справка</h3>
        <div className="area-grid">
          {AREAS.map((a) => (
            <button key={a.screen} className="area-tile" onClick={() => setState({ screen: a.screen })}>
              <span className="area-title">{a.title}</span><span className="area-text">{a.text}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
