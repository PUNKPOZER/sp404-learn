import { openProject, pickTrack } from "../state/actions";
import { useStore, setState } from "../state/store";

/** Entry to TRACK LAB: the full analysis workflow (track · stems · drums · bass · structure · SP recipe). */
export function TrackLabHome() {
  const analysis = useStore((s) => s.analysis);
  return (
    <div className="home">
      <header className="screen-head"><h1>Track Lab</h1><span className="hint">Разбор твоего трека: темп, стемы, ударные, бас, структура и рецепт для SP-404MKII.</span></header>
      <button className="drop" onClick={pickTrack} data-tour="drop">
        <span className="drop-title">Перетащи трек сюда</span>
        <span className="drop-sub">или нажми, чтобы выбрать · WAV · AIFF · MP3 · FLAC · M4A</span>
      </button>
      <div className="home-row two">
        <section className="panel">
          <h2>Проекты</h2>
          <div className="row">
            <button className="btn" onClick={() => openProject()}>Открыть проект…</button>
            {analysis && <button className="btn primary" onClick={() => setState({ screen: "track" })}>К текущему треку →</button>}
          </div>
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
