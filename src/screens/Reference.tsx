import { useMemo, useState } from "react";
import { SourceList } from "../components/SourceList";
import { CATEGORY_LABELS, REFERENCE, searchReference } from "../content/reference";
import { setState } from "../state/store";
import { t } from "../lib/i18n";

export function Reference() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const results = useMemo(() => searchReference(REFERENCE, q, cat), [q, cat]);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Reference</h1><span className="hint">{t("Короткие ответы. Подробности — в курсах и приёмах.", "Short answers. Details are in the courses and tricks.")}</span></header>
      <div className="ref-tools">
        <input type="search" placeholder={t("Поиск: кнопка, понятие, эффект…", "Search: button, concept, effect…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Поиск по справке", "Search the reference")} data-tour="refsearch" />
        <div className="seg" role="group" aria-label={t("Категория", "Category")}>
          <button className={`btn ${cat === null ? "on" : ""}`} aria-pressed={cat === null} onClick={() => setCat(null)}>{t("Все", "All")}</button>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <button key={k} className={`btn ${cat === k ? "on" : ""}`} aria-pressed={cat === k} onClick={() => setCat(k)}>{v}</button>)}
        </div>
      </div>
      <p className="mono dim" aria-live="polite">{results.length} {t("из", "of")} {REFERENCE.filter((r) => r.status === "verified").length}</p>
      <div className="ref-list">
        {results.map((r) => (
          <article key={r.id} className="ref-item">
            <div className="ref-term"><b className="mono">{r.term}</b><span className="chip soft">{CATEGORY_LABELS[r.category]}</span></div>
            <p>{r.answer}</p>
            {r.see && <button className="link" onClick={() => setState(r.see!.area === "fx" ? { screen: "fx", fxId: r.see!.id } : { screen: "trick", trickId: r.see!.id })}>{r.see.area === "fx" ? t("в FX Lab →", "in FX Lab →") : t("в Tricks →", "in Tricks →")}</button>}
            <SourceList sources={r.sources} />
          </article>
        ))}
        {results.length === 0 && <p className="hint">{t("Ничего не найдено. Попробуй другое слово или сбрось категорию.", "Nothing found. Try another word or reset the category.")}</p>}
      </div>
    </div>
  );
}
