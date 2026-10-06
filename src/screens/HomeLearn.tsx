import { useEffect } from "react";
import { DeviceDiagram } from "../components/DeviceDiagram";
import { GenreArt } from "../components/GenreArt";
import { Icon } from "../components/Icon";
import { byId, itemsOf, loc } from "../content/load";
import type { Course } from "../content/schema";
import { nextLesson, pathPercent } from "./Paths";
import { latest, percent } from "../lib/progress";
import { loadCourses, startCourse, startLesson } from "../state/actions";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";
import { RecommendList } from "../components/RecommendList";

const AREAS = [
  { screen: "fxlab" as const, title: "FX Lab", text: t("Эффекты SP-404MKII: что делают и как попробовать.", "SP-404MKII effects: what they do and how to try them."), icon: "fx" },
  { screen: "tricks" as const, title: "Tricks", text: t("Короткие приёмы: skip back, mute group, TR-REC…", "Short techniques: skip back, mute group, TR-REC…"), icon: "tricks" },
  { screen: "tracklab" as const, title: "Track Lab", text: t("Разбери свой трек: темп, стемы, ударные, бас, рецепт.", "Break down your track: tempo, stems, drums, bass, recipe."), icon: "tracklab" },
  { screen: "reference" as const, title: "Reference", text: t("Короткие ответы: кнопки, понятия, сочетания.", "Short answers: buttons, concepts, combos."), icon: "reference" },
];

/** Calm learning dashboard (board layout): title, one thing to continue, genre tiles, recent lessons, device card. */
export function HomeLearn() {
  const { courseList, progress, lessonsDone, analysis } = useStore((s) => s);
  const homeGenre = analysis?.genre_user ?? (analysis?.genre?.status === "unknown" ? null : analysis?.genre?.primaryGenre ?? null);
  const paths = itemsOf<Course>("course");
  const path = paths.find((c) => nextLesson(c, lessonsDone)) ?? paths[0];
  const nextId = path ? nextLesson(path, lessonsDone) : null;
  const nextItem = nextId ? byId(nextId) : null;
  useEffect(() => { void loadCourses(); }, []);
  const last = latest(progress);
  const current = courseList.find((c) => c.id === last?.courseId) ?? (last ? undefined : courseList[0]);
  const prog = current ? progress[current.id] : undefined;
  const recent = Object.values(progress).filter((p) => courseList.some((c) => c.id === p.courseId)).sort((a, b) => b.updated - a.updated).slice(0, 3);
  const name = (id: string) => courseList.find((c) => c.id === id)?.title ?? id;
  const pathBlock = (
    path && (
        <section className="panel path-home" aria-label={t("Учебный путь", "Learning path")} data-tour="path">
          <div className="path-home-main">
            <span className="k strong">{t("Учебный путь", "Learning path")}</span>
            <h2>{loc(path.title)}</h2>
            <p className="hint">{nextItem ? <>{t("Дальше", "Next")}: <b>{loc(nextItem.title)}</b></> : t("Путь пройден — загляни в Tricks.", "Path completed — have a look at Tricks.")}</p>
          </div>
          <div className="path-home-side">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pathPercent(path, lessonsDone)} aria-label={t("Прогресс курса", "Course progress")}><i style={{ width: `${pathPercent(path, lessonsDone)}%` }} /></div>
            <b className="mono">{pathPercent(path, lessonsDone)}%</b>
            {nextId && <button className="btn primary" onClick={() => startLesson(nextId, "home")}>{pathPercent(path, lessonsDone) ? t("Продолжить", "Continue") : t("Начать", "Start")} <Icon name="arrow" size={16} /></button>}
          </div>
        </section>
    )
  );
  return (
    <div className="screen home-learn">
      <header className="home-title">
        <h1>SP404 LEARN</h1>
        <p className="home-tag">{t("Учись / Практикуй / Разбирай / Делай музыку", "Learn / Practise / Analyse / Make music")}</p>
      </header>

      {!last && pathBlock}
      {current && (
        <section className="continue" data-tour="continue" aria-label={t("Продолжить обучение", "Continue learning")}>
          <div className="continue-body">
            <div className="continue-top">
              <span className="k strong">{prog ? t("Продолжить обучение", "Continue learning") : t("Начни здесь", "Start here")}</span>
              {prog && <><div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(prog)} aria-label={t("Прогресс курса", "Course progress")}><i style={{ width: `${percent(prog)}%` }} /></div><b className="mono">{percent(prog)}%</b></>}
            </div>
            <h2 className="continue-title">{current.title}</h2>
            <p className="continue-lesson">{prog ? <>{t("Урок", "Lesson")} {String(prog.lesson).padStart(2, "0")}<br />{prog.lessonTitle}</> : current.short}</p>
            <button className="btn primary big" onClick={() => void startCourse(current.id, true)}>{prog ? t("Продолжить", "Continue") : t("Начать", "Start")} <Icon name="arrow" size={18} /></button>
          </div>
          <GenreArt id={current.id} className="continue-art" />
        </section>
      )}


      {last && pathBlock}
      <section aria-label={t("Курсы", "Courses")}>
        <div className="section-head"><h3>{t("Курсы", "Courses")}</h3><button className="link" onClick={() => setState({ screen: "courses" })}>{t("все курсы", "all courses")}</button></div>
        <div className="course-grid gc-grid">
          {courseList.map((c, i) => {
            const p = progress[c.id];
            return (
              <button key={c.id} className="genre-card gc-open gc-tile" onClick={() => void startCourse(c.id, true)} aria-label={`${c.title}${p ? `, ${percent(p)}%` : ""}`}>
                <span className="gc-top"><span className="gc-num mono">{String(i + 1).padStart(2, "0")}</span><i className="gc-dash" />{p && <span className="gc-pct mono">{percent(p)}%</span>}</span>
                <GenreArt id={c.id} className="gc-art" />
                <span className="gc-name"><b>{c.title.split(" / ")[0]}</b><Icon name="up-right" size={18} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="home-bottom">
      <RecommendList genre={homeGenre} back="home" />

        <section className="recent" aria-label={t("Недавнее", "Recent")}>
          <h3>{t("Недавнее", "Recent")}</h3>
          {recent.length === 0 ? <p className="hint">{t("Здесь появятся курсы, которые ты начнёшь.", "Courses you start will appear here.")}</p> : (
            <ol>
              {recent.map((p, i) => (
                <li key={p.courseId}>
                  <button onClick={() => void startCourse(p.courseId, true)}>
                    <span className="rn">{i + 1}</span><span className="rt">{name(p.courseId)}</span>
                    <span className="mono dim">{t("Урок", "Lesson")} {String(p.lesson).padStart(2, "0")}</span><span className="mono">{percent(p)}%</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        <button className="device-card" onClick={() => setState({ screen: "reference" })} aria-label={t("Reference: кнопки и понятия SP-404MKII", "Reference: SP-404MKII buttons and concepts")}>
          <span className="dc-text"><b>SP-404MKII</b><span>{t(<>Практикуй<br />Изучай<br />Делай музыку<br />где угодно</>, <>Practise<br />Learn<br />Make music<br />anywhere</>)}</span></span>
          <span className="dc-art" aria-hidden><DeviceDiagram compact highlightPads={[]} display="SP-404MKII" /></span>
          <Icon name="arrow" size={22} className="dc-arrow" />
        </button>
      </div>

      <section aria-label={t("Разделы", "Sections")} data-tour="areas">
        <h3>{t("Практика и справка", "Practice and reference")}</h3>
        <div className="area-grid">
          {AREAS.map((a) => (
            <button key={a.screen} className="area-tile" onClick={() => setState({ screen: a.screen })}>
              <Icon name={a.icon} size={24} /><span className="area-title">{a.title}</span><span className="area-text">{a.text}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
