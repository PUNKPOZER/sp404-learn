import { cancelAnalysis, openTrack } from "../state/actions";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";

const ORDER = [["prepare", t("Подготовка аудио", "Preparing audio")], ["tempo", t("Определение темпа", "Detecting tempo")], ["stems", t("Разделение на стемы", "Separating stems")], ["drums", t("Поиск ударных", "Finding drums")],
  ["bass", t("Анализ баса", "Analysing bass")], ["structure", t("Определение структуры", "Detecting structure")], ["recipe", t("Сборка рецепта SP-404", "Building the SP-404 recipe")]];
const ICON: Record<string, string> = { pending: "·", running: "▸", done: "✓", warn: "!", skipped: "–" };

export function Analyzing() {
  const { stages, trackName, error, busy, trackPath } = useStore((s) => s);
  return (
    <div className="center-col">
      <h1>{t("Анализ трека", "Track analysis")}</h1>
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
        {busy ? <button className="btn" onClick={cancelAnalysis}>{t("Отмена", "Cancel")}</button>
          : <><button className="btn" onClick={() => trackPath && openTrack(trackPath, false)}>{t("Повторить", "Retry")}</button>
              <button className="btn" onClick={() => setState({ screen: "home", error: null })}>{t("Назад", "Back")}</button></>}
      </div>
    </div>
  );
}
