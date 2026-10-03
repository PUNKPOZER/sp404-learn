import { openProject, pickTrack, startCourse } from "../state/actions";
import { setState } from "../state/store";

export function Home() {
  return (
    <div className="home">
      <button className="drop" onClick={pickTrack}>
        <span className="drop-title">Перетащи трек сюда</span>
        <span className="drop-sub">или нажми, чтобы выбрать · WAV · AIFF · MP3 · FLAC · M4A</span>
      </button>
      <div className="home-row">
        <section className="panel">
          <h2>Учиться без трека</h2>
          <div className="genres">
            <button className="genre ready" onClick={startCourse}>Footwork<small>18 уроков · готов</small></button>
            {["JUNGLE", "BREAKBEAT", "HOUSE", "HIP-HOP", "TECHNO"].map((g) => <button key={g} className="genre" disabled>{g}<small>скоро</small></button>)}
          </div>
          <button className="btn" onClick={() => setState({ screen: "learn" })}>Обзор курса</button>
        </section>
        <section className="panel">
          <h2>Проекты</h2>
          <button className="btn" onClick={() => openProject()}>Открыть проект…</button>
          <p className="hint">Проекты store analysis, your corrections, pad mapping and tutorial position — not the audio.</p>
        </section>
        <section className="panel privacy">
          <h2>● Локальная обработка</h2>
          <p>Твоё аудио остаётся на этом компьютере. Без аккаунта, без телеметрии, без сетевых запросов.</p>
        </section>
      </div>
    </div>
  );
}
