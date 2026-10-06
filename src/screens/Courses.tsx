import { useEffect } from "react";
import { CourseCard } from "../components/CourseCard";
import { loadCourses, restartCourse, startCourse } from "../state/actions";
import { useStore } from "../state/store";
import { t } from "../lib/i18n";

export function Courses() {
  const { courseList, progress } = useStore((s) => s);
  useEffect(() => { void loadCourses(); }, []);
  return (
    <div className="screen">
      <header className="screen-head"><h1>{t("Курсы", "Courses")}</h1><span className="hint">{t("Авторские учебные паттерны по жанрам — не копии записей. Каждый курс заканчивается своим небольшим треком.", "Original teaching patterns by genre — not copies of recordings. Every course ends with its own small track.")}</span></header>
      {courseList.length === 0 && <p className="hint">{t("Загружаю курсы…", "Loading courses…")}</p>}
      <div className="course-grid" data-tour="courses">
        {courseList.map((c, i) => (
          <CourseCard key={c.id} course={c} index={i} progress={progress[c.id]} onOpen={() => void startCourse(c.id, true)} onRestart={() => restartCourse(c.id)} />
        ))}
      </div>
    </div>
  );
}
