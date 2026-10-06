import { useMemo, useState } from "react";
import { SourceList } from "../components/SourceList";
import { CATEGORY_LABELS, REFERENCE, searchReference } from "../content/reference";
import { setState } from "../state/store";

export function Reference() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const results = useMemo(() => searchReference(REFERENCE, q, cat), [q, cat]);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Reference</h1><span className="hint">Короткие ответы. Подробности — в курсах и приёмах.</span></header>
      <div className="ref-tools">
        <input type="search" placeholder="Поиск: кнопка, понятие, эффект…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по справке" data-tour="refsearch" />
        <div className="seg" role="group" aria-label="Категория">
          <button className={`btn ${cat === null ? "on" : ""}`} aria-pressed={cat === null} onClick={() => setCat(null)}>Все</button>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <button key={k} className={`btn ${cat === k ? "on" : ""}`} aria-pressed={cat === k} onClick={() => setCat(k)}>{v}</button>)}
        </div>
      </div>
      <p className="mono dim" aria-live="polite">{results.length} из {REFERENCE.filter((r) => r.status === "verified").length}</p>
      <div className="ref-list">
        {results.map((r) => (
          <article key={r.id} className="ref-item">
            <div className="ref-term"><b className="mono">{r.term}</b><span className="chip soft">{CATEGORY_LABELS[r.category]}</span></div>
            <p>{r.answer}</p>
            {r.see && <button className="link" onClick={() => setState(r.see!.area === "fx" ? { screen: "fx", fxId: r.see!.id } : { screen: "trick", trickId: r.see!.id })}>{r.see.area === "fx" ? "в FX Lab →" : "в Tricks →"}</button>}
            <SourceList sources={r.sources} />
          </article>
        ))}
        {results.length === 0 && <p className="hint">Ничего не найдено. Попробуй другое слово или сбрось категорию.</p>}
      </div>
    </div>
  );
}
