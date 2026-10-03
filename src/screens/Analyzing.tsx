import { cancelAnalysis, openTrack } from "../state/actions";
import { setState, useStore } from "../state/store";

const ORDER = [["prepare", "Подготовка аудио"], ["tempo", "Определение темпа"], ["stems", "Разделение на стемы"], ["drums", "Поиск ударных"],
  ["bass", "Анализ баса"], ["structure", "Определение структуры"], ["recipe", "Сборка рецепта SP-404"]];
const ICON: Record<string, string> = { pending: "·", running: "▸", done: "✓", warn: "!", skipped: "–" };

export function Analyzing() {
  const { stages, trackName, error, busy, trackPath } = useStore((s) => s);
  return (
    <div className="center-col">
      <h1>Анализ трека</h1>
      <p className="mono dim">{trackName}</p>
      <ol className="stages">
        {ORDER.map(([id, label]) => {
          const st = stages.find((s) => s.id === id);
          const status = st?.status ?? "pending";
          return (
            <li key={id} className={`stage ${status}`}>
              <span className="ico">{ICON[status]}</span><span className="lbl">{label}</span>
              <span className="det">{st?.detail}{st && st.seconds ? ` · ${st.seconds}s` : ""}</span>
            </li>
          );
        })}
      </ol>
      {error && <div className="err">{error}</div>}
      <div className="row">
        {busy ? <button className="btn" onClick={cancelAnalysis}>Отмена</button>
          : <><button className="btn" onClick={() => trackPath && openTrack(trackPath, false)}>Повторить</button>
              <button className="btn" onClick={() => setState({ screen: "home", error: null })}>Назад</button></>}
      </div>
    </div>
  );
}
