import { openProject, pickTrack } from "../state/actions";
import { useStore, setState } from "../state/store";
import { t } from "../lib/i18n";

/** Entry to TRACK LAB: the full analysis workflow (track · stems · drums · bass · structure · SP recipe). */
export function TrackLabHome() {
  const analysis = useStore((s) => s.analysis);
  return (
    <div className="home">
      <header className="screen-head"><h1>Track Lab</h1><span className="hint">{t("Разбор твоего трека: темп, стемы, ударные, бас, структура и рецепт для SP-404MKII.", "Break down your track: tempo, stems, drums, bass, structure and an SP-404MKII recipe.")}</span></header>
      <button className="drop" onClick={pickTrack} data-tour="drop">
        <span className="drop-title">{t("Перетащи трек сюда", "Drop a track here")}</span>
        <span className="drop-sub">{t("или нажми, чтобы выбрать", "or click to choose")} · WAV · AIFF · MP3 · FLAC · M4A</span>
      </button>
      <div className="home-row two">
        <section className="panel">
          <h2>{t("Проекты", "Projects")}</h2>
          <div className="row">
            <button className="btn" onClick={() => openProject()}>{t("Открыть проект…", "Open project…")}</button>
            {analysis && <button className="btn primary" onClick={() => setState({ screen: "track" })}>{t("К текущему треку →", "To the current track →")}</button>}
          </div>
          <p className="hint">{t("Проект хранит анализ, твои правки, раскладку пэдов и место в уроке — но не само аудио.", "A project stores the analysis, your edits, the pad layout and your place in the lesson — but not the audio itself.")}</p>
        </section>
        <section className="panel privacy">
          <h2>● {t("Локальная обработка", "Local processing")}</h2>
          <p>{t("Твоё аудио остаётся на этом компьютере. Без аккаунта, без телеметрии, без сетевых запросов.", "Your audio stays on this computer. No account, no telemetry, no network requests.")}</p>
        </section>
      </div>
    </div>
  );
}
