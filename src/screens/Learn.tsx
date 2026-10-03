import { useEffect } from "react";
import { loadCourses, startCourse } from "../state/actions";
import { useStore } from "../state/store";

export function Learn() {
  const list = useStore((s) => s.courseList);
  useEffect(() => { void loadCourses(); }, []);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Обучение</h1><span className="hint">Курсы строятся на авторских учебных паттернах — не копиях конкретных записей. Каждый заканчивается своим небольшим треком.</span></header>
      {list.length === 0 && <p className="hint">Загружаю курсы…</p>}
      <div className="courses">
        {list.map((c) => (
          <article key={c.id} className="course">
            <div className="course-top"><h3>{c.title}</h3><span className="chip">{c.bpm} BPM</span></div>
            <p className="course-short">{c.short}</p>
            <p className="hint" style={{ margin: 0 }}>{c.summary}</p>
            <ol className="course-lessons">{c.lessons.map((l) => <li key={l.n}>{l.title}</li>)}</ol>
            <button className="btn primary" onClick={() => void startCourse(c.id)}>Начать · {c.lessons.length} уроков ▸</button>
          </article>
        ))}
      </div>
    </div>
  );
}
