import { useEffect } from "react";
import { DeviceDiagram } from "../components/DeviceDiagram";
import { GenreArt } from "../components/GenreArt";
import { Icon } from "../components/Icon";
import { latest, percent } from "../lib/progress";
import { loadCourses, startCourse } from "../state/actions";
import { setState, useStore } from "../state/store";

const AREAS = [
  { screen: "fxlab" as const, title: "FX Lab", text: "Эффекты SP-404MKII: что делают и как попробовать.", icon: "fx" },
  { screen: "tricks" as const, title: "Tricks", text: "Короткие приёмы: skip back, mute group, TR-REC…", icon: "tricks" },
  { screen: "tracklab" as const, title: "Track Lab", text: "Разбери свой трек: темп, стемы, ударные, бас, рецепт.", icon: "tracklab" },
  { screen: "reference" as const, title: "Reference", text: "Короткие ответы: кнопки, понятия, сочетания.", icon: "reference" },
];

/** Calm learning dashboard (board layout): title, one thing to continue, genre tiles, recent lessons, device card. */
export function HomeLearn() {
  const { courseList, progress } = useStore((s) => s);
  useEffect(() => { void loadCourses(); }, []);
  const last = latest(progress);
  const current = courseList.find((c) => c.id === last?.courseId) ?? (last ? undefined : courseList[0]);
  const prog = current ? progress[current.id] : undefined;
  const recent = Object.values(progress).filter((p) => courseList.some((c) => c.id === p.courseId)).sort((a, b) => b.updated - a.updated).slice(0, 3);
  const name = (id: string) => courseList.find((c) => c.id === id)?.title ?? id;
  return (
    <div className="screen home-learn">
      <header className="home-title">
        <h1>SP404 LEARN</h1>
        <p className="home-tag">Учись / Практикуй / Разбирай / Делай музыку</p>
      </header>

      {current && (
        <section className="continue" data-tour="continue" aria-label="Продолжить обучение">
          <div className="continue-body">
            <div className="continue-top">
              <span className="k strong">{prog ? "Продолжить обучение" : "Начни здесь"}</span>
              {prog && <><div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(prog)} aria-label="Прогресс курса"><i style={{ width: `${percent(prog)}%` }} /></div><b className="mono">{percent(prog)}%</b></>}
            </div>
            <h2 className="continue-title">{current.title}</h2>
            <p className="continue-lesson">{prog ? <>Урок {String(prog.lesson).padStart(2, "0")}<br />{prog.lessonTitle}</> : current.short}</p>
            <button className="btn primary big" onClick={() => void startCourse(current.id, true)}>{prog ? "Продолжить" : "Начать"} <Icon name="arrow" size={18} /></button>
          </div>
          <GenreArt id={current.id} className="continue-art" />
        </section>
      )}

      <section aria-label="Курсы">
        <div className="section-head"><h3>Курсы</h3><button className="link" onClick={() => setState({ screen: "courses" })}>все курсы</button></div>
        <div className="genre-tiles">
          {courseList.map((c) => {
            const p = progress[c.id];
            return (
              <button key={c.id} className="genre-tile" onClick={() => void startCourse(c.id, true)} aria-label={`${c.title}${p ? `, ${percent(p)}%` : ""}`}>
                <GenreArt id={c.id} className="tile-art" />
                <span className="tile-name">{c.title}</span>
                {p && <span className="tile-pct mono">{percent(p)}%</span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="home-bottom">
        <section className="recent" aria-label="Недавнее">
          <h3>Недавнее</h3>
          {recent.length === 0 ? <p className="hint">Здесь появятся курсы, которые ты начнёшь.</p> : (
            <ol>
              {recent.map((p, i) => (
                <li key={p.courseId}>
                  <button onClick={() => void startCourse(p.courseId, true)}>
                    <span className="rn">{i + 1}</span><span className="rt">{name(p.courseId)}</span>
                    <span className="mono dim">Урок {String(p.lesson).padStart(2, "0")}</span><span className="mono">{percent(p)}%</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        <button className="device-card" onClick={() => setState({ screen: "reference" })} aria-label="Reference: кнопки и понятия SP-404MKII">
          <span className="dc-text"><b>SP-404MKII</b><span>Практикуй<br />Изучай<br />Делай музыку<br />где угодно</span></span>
          <span className="dc-art" aria-hidden><DeviceDiagram compact highlightPads={[]} display="SP-404MKII" /></span>
          <Icon name="arrow" size={22} className="dc-arrow" />
        </button>
      </div>

      <section aria-label="Разделы" data-tour="areas">
        <h3>Практика и справка</h3>
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
