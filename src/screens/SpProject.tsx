import { Waveform } from "../components/Waveform";
import { t } from "../lib/i18n";
import { stopSource, toggleSource } from "../lib/audio/sourcePlayer";
import { analyzeProjectSource } from "../state/actions";
import { setState, useStore } from "../state/store";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const WHO: Record<string, string> = { "sp404-drop": "SP404 DROP", "sp404-learn": "SP-404 LEARN" };

/** An opened .spsystem project (e.g. sent from SP404 DROP): what DROP stored — track, tempo, chops, samples, pads, loops — and what LEARN has added.
 *  Nothing here analyses automatically; the user chooses. */
export function SpProject() {
  const { spsystem: sp, peaks, stemTime, playing, busy } = useStore((s) => s);
  if (!sp) return <div className="screen"><p className="hint">{t("Проект SP SYSTEM не открыт.", "No SP SYSTEM project is open.")}</p></div>;
  const p = sp.project, dur = sp.source.durationSeconds ?? 0;
  const bank = sp.pads.filter((a) => a.bank === "A");
  const sample = (id: string | null) => sp.samples.find((x) => x.id === id);
  const bpm = sp.tempo.effective;
  return (
    <div className="screen sp-project">
      <header className="screen-head"><h1>{p.title ?? t("Проект SP SYSTEM", "SP SYSTEM project")}</h1>
        <span className="hint">{t("Проект SP SYSTEM", "SP SYSTEM project")} · {t("версия", "revision")} {p.revision} · {t("создан в", "created in")} {WHO[p.createdBy ?? ""] ?? p.createdBy}{p.modifiedBy && p.modifiedBy !== p.createdBy ? ` · ${t("последнее сохранение", "last saved by")} ${WHO[p.modifiedBy] ?? p.modifiedBy}` : ""}</span></header>
      <p className="mono dim sp-path" title={sp.path}>{sp.path}</p>

      <section className="panel">
        <h2>{t("Трек", "Track")} <small>{sp.source.state === "embedded" ? t("звук внутри проекта", "audio is inside the project") : sp.source.state === "external-ok" ? t("звук по ссылке", "audio by reference") : t("звук недоступен", "audio not available")}</small></h2>
        {peaks.length > 0 && <Waveform peaks={peaks} analysis={null} height={110} playTime={playing ? stemTime : null} />}
        <div className="row">
          <button className="btn" disabled={!sp.source.path} onClick={() => sp.source.path && void toggleSource(sp.source.path)}>{playing ? t("■ Стоп", "■ Stop") : t("▶ Играть", "▶ Play")}</button>
          <span className="mono dim">{dur ? mmss(dur) : ""}</span>
          {bpm ? <span className="chip">{bpm.toFixed(bpm % 1 ? 1 : 0)} BPM{p.tempo?.origin === "user" ? ` · ${t("задан вручную", "set by hand")}` : ""}</span> : null}
          {p.meter ? <span className="chip soft">{p.meter.beatsPerBar}/4</span> : null}
        </div>
      </section>

      <section className="panel" data-tour="sp-analysis">
        <h2>{t("Анализ LEARN", "LEARN analysis")}</h2>
        {sp.hasAnalysis ? <p className="hint">{t("В проекте есть анализ, но он неполный — открыть Track Lab нечем. Можно запустить анализ заново.", "The project has an analysis, but it is incomplete for Track Lab. You can analyse again.")}</p>
          : <p className="hint">{t("Анализа пока нет. Он не запускается сам: нажми, когда нужно. Результат сохранится в этот же проект.", "There is no analysis yet. It never starts by itself: press the button when you want it. The result is saved into this same project.")}</p>}
        <button className="btn primary" disabled={!sp.source.path || busy === "analyze"} onClick={() => { stopSource(); void analyzeProjectSource(); }}>{t("Анализировать трек ▸", "Analyse the track ▸")}</button>
      </section>

      <div className="two-col">
        <section className="panel"><h2>{t("Нарезки", "Chops")} <small>{sp.chops.length}</small></h2>
          {sp.chops.length === 0 ? <p className="hint">{t("Нет.", "None.")}</p> : (
            <table className="kv"><tbody>{sp.chops.map((c) => (
              <tr key={c.id}><th>{c.name ?? c.id}</th><td className="mono">{mmss(c.startSeconds)}.{String(Math.round((c.startSeconds % 1) * 10))} → {mmss(c.endSeconds)}.{String(Math.round((c.endSeconds % 1) * 10))}</td></tr>))}</tbody></table>)}
        </section>
        <section className="panel"><h2>{t("Пэды", "Pads")} <small>{t("банк", "bank")} A</small></h2>
          {bank.length === 0 ? <p className="hint">{t("Пэды не назначены.", "No pads assigned.")}</p> : (
            <div className="sp-pads" role="grid" aria-label={t("Банк A", "Bank A")}>
              {[13, 14, 15, 16, 9, 10, 11, 12, 5, 6, 7, 8, 1, 2, 3, 4].map((n) => {
                const a = bank.find((x) => x.pad === n); const sm = sample(a?.sampleId ?? null);
                return <div key={n} role="gridcell" className={`sp-pad ${a?.sampleId ? "on" : ""}`}><b>{n}</b><span>{a?.label ?? sm?.name ?? a?.sampleId ?? ""}</span></div>;
              })}
            </div>)}
        </section>
      </div>
      <div className="two-col">
        <section className="panel"><h2>{t("Сэмплы", "Samples")} <small>{sp.samples.length}</small></h2>
          {sp.samples.length === 0 ? <p className="hint">{t("Нет.", "None.")}</p> : <table className="kv"><tbody>{sp.samples.map((x) => <tr key={x.id}><th>{x.name ?? x.id}</th><td className="mono">{x.durationSeconds.toFixed(2)} s{x.category ? ` · ${x.category}` : ""}</td></tr>)}</tbody></table>}
        </section>
        <section className="panel"><h2>{t("Лупы", "Loops")} <small>{sp.loops.length}</small></h2>
          {sp.loops.length === 0 ? <p className="hint">{t("Нет.", "None.")}</p> : <table className="kv"><tbody>{sp.loops.map((x) => <tr key={x.id}><th>{x.name ?? x.id}</th><td className="mono">{mmss(x.startSeconds)} → {mmss(x.endSeconds)}{x.bars ? ` · ${x.bars} ${t("тактов", "bars")}` : ""}</td></tr>)}</tbody></table>}
        </section>
      </div>
      {sp.issues.some((i) => i.severity === "warning" && i.code !== "W_UNKNOWN_FILE") && (
        <section className="panel"><h2>{t("Предупреждения", "Warnings")}</h2><ul className="bullets">{sp.issues.filter((i) => i.code !== "W_UNKNOWN_FILE").map((i, k) => <li key={k}><span className="mono">{i.code}</span> {i.message}</li>)}</ul></section>)}
      <button className="link" onClick={() => setState({ screen: "home" })}>{t("← На главную", "← Home")}</button>
    </div>
  );
}
