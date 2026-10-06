import { useState } from "react";
import type { TrackAnalysis } from "../lib/types";
import { CORRECTABLE, genreName, STATUS_TEXT } from "../lib/genres";
import { t } from "../lib/i18n";
import { setGenreUser } from "../state/actions";
import { setState } from "../state/store";

/** Genre Engine 2.0 result: ranked candidates, honest status (hybrid / unclear), the user's correction, and the evidence. */
export function GenreCard({ a }: { a: TrackAnalysis }) {
  const g = a.genre;
  const [editing, setEditing] = useState(false);
  if (!g || !g.available || g.error || !g.candidates?.length) return null;
  const user = a.genre_user;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const [first, ...rest] = g.candidates;
  const hybrid = g.status !== "confident";
  return (
    <section className="panel genre-card-panel" data-tour="genre">
      <h2>{t("Жанр", "Genre")} <small>{t("подсказка, не вердикт", "a hint, not a verdict")}</small></h2>
      {user ? (
        <p className="genre-main"><b>{genreName(user)}</b> <span className="chip solid">{t("ваш выбор", "your choice")}</span>
          <small className="dim"> · {t("определено", "detected")}: {genreName(g.primaryGenre)}</small></p>
      ) : (
        <>
          <p className="genre-status k">{STATUS_TEXT(g.status ?? "unknown")}</p>
          {!hybrid || g.status === "hybrid" ? (
            <p className="genre-main"><b>{hybrid ? g.candidates.slice(0, 2).map((c) => genreName(c.genre)).join(" / ") : genreName(first.genre)}</b>
              {g.subgenre && <span className="chip soft">{genreName(g.subgenre)}</span>}</p>
          ) : null}
        </>
      )}
      <div className="genre-cands">
        {[first, ...rest].slice(0, 4).map((c) => (
          <div key={c.genre} className="style"><span>{genreName(c.genre)}</span><div className="meter"><i style={{ width: `${c.confidence * 100}%` }} /></div><small className="mono">{g.status === "confident" || c === first ? pct(c.confidence) : pct(c.confidence)}</small></div>
        ))}
      </div>
      <div className="genre-actions">
        {!editing ? <button className="btn sm" onClick={() => setEditing(true)}>{t("Не так? Сменить жанр", "Not right? Change genre")}</button> : (
          <span className="row">
            <select aria-label={t("Жанр", "Genre")} value={user ?? ""} onChange={(e) => { void setGenreUser(e.target.value || null); setEditing(false); }}>
              <option value="">{t("— как определено —", "— as detected —")}</option>
              {CORRECTABLE.map((id) => <option key={id} value={id}>{genreName(id)}</option>)}
            </select>
            <button className="link" onClick={() => setEditing(false)}>{t("отмена", "cancel")}</button>
          </span>
        )}
        {user && <button className="link" onClick={() => void setGenreUser(null)}>{t("вернуть определённый", "back to detected")}</button>}
      </div>
      <details className="genre-details"><summary>{t("Почему так", "Why")}</summary>
        {(g.evidence ?? []).map((e, i) => <p key={i} className="hint"><b>{e.source}</b>: {e.text}</p>)}
        <p className="hint">{t("Определено моделью Discogs-EffNet и ритмом трека. Проценты — доля уверенности, а не гарантия.", "From the Discogs-EffNet model plus the track's rhythm. Percentages are confidence shares, not guarantees.")}</p>
      </details>
    </section>
  );
}

export function GenrePackHint() {
  return (
    <section className="panel">
      <h2>{t("Жанр", "Genre")} <small>{t("подсказка по ритму", "rhythm-only hint")}</small></h2>
      <p className="hint">{t("Надёжное определение жанра работает с необязательным пакетом Genre Pack (~18 МБ, лицензия CC BY-NC-SA, скачивается по кнопке).", "Reliable genre detection needs the optional Genre Pack (~18 MB, CC BY-NC-SA licence, downloaded on your click).")}</p>
      <button className="btn sm" onClick={() => setState({ screen: "settings" })}>{t("Открыть Настройки → Genre Pack", "Open Settings → Genre Pack")}</button>
    </section>
  );
}
