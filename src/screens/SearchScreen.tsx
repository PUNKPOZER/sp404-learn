import { useMemo } from "react";
import { groupResults, search } from "../lib/search";
import { t } from "../lib/i18n";
import { openLibraryItem } from "../state/actions";
import { setState, useStore } from "../state/store";

const GROUP: Record<string, [string, string]> = { course: ["КУРСЫ", "COURSES"], lesson: ["УРОКИ", "LESSONS"], trick: ["ПРИЁМЫ", "TRICKS"], reference: ["REFERENCE", "REFERENCE"], fx: ["ЭФФЕКТЫ", "FX"], exercise: ["ПРАКТИКА", "PRACTICE"], recipe: ["РЕЦЕПТЫ", "RECIPES"] };

export function SearchScreen() {
  const q = useStore((s) => s.searchQuery);
  const back = useStore((s) => s.searchBack);
  const groups = useMemo(() => groupResults(search(q)), [q]);
  const total = groups.reduce((n, [, l]) => n + l.length, 0);
  return (
    <div className="screen">
      <header className="screen-head"><h1>{t("Поиск", "Search")}</h1>
        <span className="hint">{q.trim() ? t(`Найдено: ${total}`, `${total} found`) : t("Ищи по урокам, приёмам, эффектам и справке — например «ресэмпл», «vocal chop», «jungle», «DJFX», «бас».", "Search lessons, tricks, effects and reference — try “resample”, “vocal chop”, “jungle”, “DJFX”, “bass”.")}</span></header>
      {q.trim() && !total && <p className="hint">{t("Ничего не найдено. Попробуй другое слово или английский термин.", "Nothing found. Try another word.")}</p>}
      {groups.map(([type, list]) => (
        <section key={type} className="panel search-group">
          <h2 className="k">{t(...GROUP[type])} · {list.length}</h2>
          <ul className="search-list">
            {list.map((r) => (
              <li key={r.id}><button className="search-row" onClick={() => openLibraryItem(r.type, r.id, "search")}>
                <b>{r.title}</b><span className="dim">{r.summary}</span>
              </button></li>
            ))}
          </ul>
        </section>
      ))}
      <button className="btn sm" onClick={() => setState({ searchQuery: "", screen: back === "search" ? "home" : back })}>{t("Закрыть поиск", "Close search")}</button>
    </div>
  );
}
