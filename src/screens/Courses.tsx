import { useEffect, useState } from "react";
import { Paths } from "./Paths";
import { PracticeList } from "./Practice";
import { CourseCard } from "../components/CourseCard";
import { loadCourses, restartCourse, startCourse } from "../state/actions";
import { getState, setState, useStore } from "../state/store";
import { t } from "../lib/i18n";

export function Courses() {
  const { courseList, progress } = useStore((s) => s);
  useEffect(() => { void loadCourses(); }, []);
  const [tab, setTab] = useState<"paths" | "deep" | "genres" | "practice">(() => getState().coursesTab ?? "paths");
  useEffect(() => { if (getState().coursesTab) setState({ coursesTab: null }); }, []);
  return (
    <div className="screen">
      <header className="screen-head"><h1>{t("Курсы", "Courses")}</h1><span className="hint">{tab === "practice" ? t("Слушай, смотри, повторяй, играй: паттерн можно скрывать, чтобы запомнить его наизусть.", "Listen, watch, copy, play: the pattern can be hidden so you learn it by heart.") : tab === "deep" ? t("10 уроков на жанр: что делает жанр жанром, барабаны, грув, бас, нарезки, эффекты, вариации, аранжировка, исполнение и мини-трек. Все паттерны — авторские.", "10 lessons per genre: what defines it, drums, groove, bass, chops, FX, variation, arrangement, performance and a mini track. All patterns are original.") : tab === "paths" ? t("Пошаговые курсы: от первого включения до готового трека. Каждый шаг с кнопками сверен с руководством Roland.", "Step-by-step paths: from the first power-on to a finished track. Every button step is checked against Roland's manual.") : t("Авторские учебные паттерны по жанрам — не копии записей. Каждый курс заканчивается своим небольшим треком.", "Original teaching patterns by genre — not copies of recordings. Every course ends with its own small track.")}</span></header>
      <div className="seg tabs" role="tablist" aria-label={t("Тип курсов", "Course type")}>
        {(["paths", "deep", "genres", "practice"] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} className={`btn ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{k === "paths" ? t("Обучение", "Learning paths") : k === "deep" ? t("Жанры: глубже", "Genre deep-dives") : k === "practice" ? t("Практика", "Practice") : t("Жанры: паттерны", "Genre patterns")}</button>)}
      </div>
      {tab === "paths" ? <Paths /> : tab === "deep" ? <Paths kind="genre" /> : tab === "practice" ? <PracticeList /> : <>
      {courseList.length === 0 && <p className="hint">{t("Загружаю курсы…", "Loading courses…")}</p>}
      <div className="course-grid" data-tour="courses">
        {courseList.map((c, i) => (
          <CourseCard key={c.id} course={c} index={i} progress={progress[c.id]} onOpen={() => void startCourse(c.id, true)} onRestart={() => restartCourse(c.id)} />
        ))}
      </div>
      </>}
    </div>
  );
}
