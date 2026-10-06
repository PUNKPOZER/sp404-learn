import { useEffect } from "react";
import { CourseCard } from "../components/CourseCard";
import { loadCourses, restartCourse, startCourse } from "../state/actions";
import { useStore } from "../state/store";

export function Courses() {
  const { courseList, progress } = useStore((s) => s);
  useEffect(() => { void loadCourses(); }, []);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Курсы</h1><span className="hint">Авторские учебные паттерны по жанрам — не копии записей. Каждый курс заканчивается своим небольшим треком.</span></header>
      {courseList.length === 0 && <p className="hint">Загружаю курсы…</p>}
      <div className="course-grid" data-tour="courses">
        {courseList.map((c) => (
          <CourseCard key={c.id} course={c} progress={progress[c.id]} onOpen={() => void startCourse(c.id, true)} onRestart={() => restartCourse(c.id)} />
        ))}
      </div>
    </div>
  );
}
