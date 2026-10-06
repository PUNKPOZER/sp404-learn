import { useMemo, useState } from "react";
import { DifficultyBadge, DurationChip } from "../components/Chips";
import { FX } from "../content/fx";
import { PLANNED } from "../content/load";
import { verified } from "../content/types";
import { setState } from "../state/store";
import { t } from "../lib/i18n";

export const FX_CATEGORIES: [string, string, string][] = [
  ["filter", "Фильтры", "Filters"], ["delay", "Задержки", "Delays"], ["reverb", "Реверб и пространство", "Reverb & space"], ["modulation", "Модуляция", "Modulation"],
  ["lofi", "Lo-fi", "Lo-fi"], ["distortion", "Искажение", "Distortion"], ["dynamics", "Динамика и эквалайзер", "Dynamics & EQ"], ["pitch", "Высота и резонанс", "Pitch & resonance"],
  ["dj", "DJ-эффекты", "DJ effects"], ["creative", "Голос и вход (INPUT FX)", "Voice & input (INPUT FX)"],
];
export const fxCategoryName = (id?: string) => { const c = FX_CATEGORIES.find((x) => x[0] === id); return c ? t(c[1], c[2]) : ""; };

export function FxLab() {
  const all = verified(FX);
  const planned = PLANNED.fx.length;
  const [cat, setCat] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const items = useMemo(() => all.filter((e) => (!cat || e.category === cat) && (!level || e.difficulty === level)
    && (!q.trim() || `${e.name} ${e.whatItDoes}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, cat, level, q]);
  const pill = (key: string | null, cur: string | null, set: (v: string | null) => void, label: string, n?: number) => (
    <button key={key ?? "all"} className={`btn sm ${cur === key ? "on" : ""}`} aria-pressed={cur === key} onClick={() => set(key)}>{label}{n != null ? ` · ${n}` : ""}</button>
  );
  return (
    <div className="screen">
      <header className="screen-head"><h1>FX Lab</h1><span className="hint">{t("Эффекты SP-404MKII через короткие упражнения. Все описания сверены с официальным руководством Roland.", "SP-404MKII effects through short exercises. Every description is checked against Roland's official manual.")}</span></header>
      <div className="filters">
        <input type="search" placeholder={t("Поиск эффекта…", "Search effects…")} aria-label={t("Поиск эффекта", "Search effects")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label={t("Категория", "Category")}>
          {pill(null, cat, setCat, t("Все", "All"), all.length)}
          {FX_CATEGORIES.map(([id, ru, en]) => pill(id, cat, setCat, t(ru, en), all.filter((e) => e.category === id).length))}
        </div>
        <div className="seg" role="group" aria-label={t("Сложность", "Difficulty")}>
          {pill(null, level, setLevel, t("Любая", "Any"))}
          {([["beginner", "Новичок", "Beginner"], ["intermediate", "Средний", "Intermediate"], ["advanced", "Продвинутый", "Advanced"]] as const).map(([id, ru, en]) => pill(id, level, setLevel, t(ru, en)))}
        </div>
      </div>
      <p className="mono dim" aria-live="polite">{items.length} {t("из", "of")} {all.length}</p>
      <div className="fx-grid" data-tour="fxlist">
        {items.map((e) => (
          <button key={e.id} className="fx-card" onClick={() => setState({ screen: "fx", fxId: e.id })}>
            <span className="row"><span className="chip">{e.button ?? (e.kind === "input" ? "INPUT FX" : "MFX")}</span><DifficultyBadge level={e.difficulty} /></span>
            <span className="fx-name">{e.name}</span>
            <span className="fx-sum">{e.whatItDoes}</span>
            <span className="mono dim">{fxCategoryName(e.category)} · {e.params.length} {t("парам.", "params")} · <DurationChip min={e.durationMin} /></span>
          </button>
        ))}
      </div>
      {items.length === 0 && <p className="hint">{t("Ничего не найдено — сбрось фильтры.", "Nothing found — reset the filters.")}</p>}
      {planned > 0 && <p className="hint">{t(`Остальные эффекты появятся после сверки с руководством (${planned} в плане).`, `The remaining effects will appear once checked against the manual (${planned} planned).`)}</p>}
    </div>
  );
}
