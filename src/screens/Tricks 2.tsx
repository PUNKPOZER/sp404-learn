import { useMemo, useState } from "react";
import { DifficultyBadge, DurationChip } from "../components/Chips";
import { PLANNED_TOPICS, TRICKS } from "../content/tricks";
import { verified } from "../content/types";
import { setState } from "../state/store";
import { t as tx } from "../lib/i18n";

const GROUPS: [string, string, string][] = [
  ["chopping", "Нарезка", "Chopping"], ["rhythm", "Ритм", "Rhythm"], ["resampling", "Ресэмплинг", "Resampling"], ["bass", "Бас", "Bass"],
  ["fx", "Эффекты", "FX"], ["workflow", "Рабочий процесс", "Workflow"], ["performance", "Выступление", "Performance"], ["external", "Внешние схемы", "External"],
];
const LEVELS: [string, string, string][] = [["beginner", "Новичок", "Beginner"], ["intermediate", "Средний", "Intermediate"], ["advanced", "Продвинутый", "Advanced"]];

export function Tricks() {
  const all = verified(TRICKS);
  const [group, setGroup] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const items = useMemo(() => all.filter((t) => (!group || t.group === group) && (!level || t.difficulty === level)
    && (!q.trim() || `${t.title} ${t.summary} ${t.topic}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, group, level, q]);
  const pill = (key: string | null, cur: string | null, set: (v: string | null) => void, label: string, n?: number) => (
    <button key={key ?? "all"} className={`btn sm ${cur === key ? "on" : ""}`} aria-pressed={cur === key} onClick={() => set(key)}>{label}{n != null ? ` · ${n}` : ""}</button>
  );
  return (
    <div className="screen">
      <header className="screen-head"><h1>Tricks</h1><span className="hint">{tx("Короткие приёмы — намного короче курсов. Каждый проверен по официальному руководству Roland.", "Short techniques — much shorter than courses. Each one is checked against Roland's official manual.")}</span></header>
      <div className="filters">
        <input type="search" placeholder={tx("Поиск по приёмам…", "Search techniques…")} aria-label={tx("Поиск по приёмам", "Search techniques")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label={tx("Категория", "Category")}>
          {pill(null, group, setGroup, tx("Все", "All"), all.length)}
          {GROUPS.map(([id, ru, en]) => pill(id, group, setGroup, tx(ru, en), all.filter((t) => t.group === id).length))}
        </div>
        <div className="seg" role="group" aria-label={tx("Сложность", "Difficulty")}>
          {pill(null, level, setLevel, tx("Любая", "Any"))}
          {LEVELS.map(([id, ru, en]) => pill(id, level, setLevel, tx(ru, en)))}
        </div>
      </div>
      <p className="mono dim" aria-live="polite">{items.length} {tx("из", "of")} {all.length}</p>
      <div className="fx-grid" data-tour="tricklist">
        {items.map((t) => (
          <button key={t.id} className="fx-card" onClick={() => setState({ screen: "trick", trickId: t.id })}>
            <span className="row"><span className="chip">{t.topic}</span><DifficultyBadge level={t.difficulty} /></span>
            <span className="fx-name">{t.title}</span>
            <span className="fx-sum">{t.summary}</span>
            <span className="mono dim">{t.steps.length} {tx("шагов", "steps")} · <DurationChip min={t.durationMin} /></span>
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="hint">{tx("Ничего не найдено — сбрось фильтры.", "Nothing found — reset the filters.")}</p>}
      <p className="hint">{tx("В плане", "Planned")}: {PLANNED_TOPICS.join(", ")}. {tx("Они появятся после проверки по руководству.", "They will appear once checked against the manual.")}</p>
    </div>
  );
}
