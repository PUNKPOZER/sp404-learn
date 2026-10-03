import { useEffect } from "react";
import { loadCourses, openProject, pickTrack, startCourse } from "../state/actions";
import { setState, useStore } from "../state/store";

export function Home() {
  const list = useStore((x) => x.courseList);
  useEffect(() => { void loadCourses(); }, []);
  return (
    <div className="home">
      <button className="drop" onClick={pickTrack} data-tour="drop">
        <span className="drop-title">Перетащи трек сюда</span>
        <span className="drop-sub">или нажми, чтобы выбрать · WAV · AIFF · MP3 · FLAC · M4A</span>
      </button>
      <div className="home-row">
        <section className="panel" data-tour="learn-card">
          <h2>Учиться без трека</h2>
          <div className="genres">
            {list.map((c) => <button key={c.id} className="genre ready" onClick={() => void startCourse(c.id)}>{c.title}<small>{c.lessons.length} уроков · {c.bpm} BPM</small></button>)}
          </div>
          <button className="btn" onClick={() => setState({ screen: "learn" })}>Обзор курса</button>
        </section>
        <section className="panel">
          <h2>Проекты</h2>
          <button className="btn" onClick={() => openProject()}>Открыть проект…</button>
          <p className="hint">Проект хранит анализ, твои правки, раскладку пэдов и место в уроке — но не само аудио.</p>
        </section>
        <section className="panel privacy">
          <h2>● Локальная обработка</h2>
          <p>Твоё аудио остаётся на этом компьютере. Без аккаунта, без телеметрии, без сетевых запросов.</p>
        </section>
      </div>
    </div>
  );
}
