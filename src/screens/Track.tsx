import { useEffect } from "react";
import { seekStems } from "../lib/audio/stemPlayer";
import { SectionStrip } from "../components/ArrangementStrip";
import { SECTION_LEGEND } from "../lib/sections";
import { playingSection, toggleSection } from "../lib/sectionPlay";
import { Waveform } from "../components/Waveform";
import { doubleBpm, halveBpm, loadGenre, nudgeDownbeat, nudgeStep, prepareInDrop, setGrid } from "../state/actions";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";
import { GenreCard, GenrePackHint } from "../components/GenreCard";
import { ExplainCard } from "../components/ExplainCard";
import { explainTrack } from "../lib/explain";
import { engineText } from "../lib/engineText";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Track() {
  const { analysis: a, peaks, currentBar, stemTime, audioTag, stemPlaying, recipe, busy } = useStore((s) => s);
  useEffect(() => { void loadGenre(); }, [a?.audio_hash]);
  if (!a) return null;
  const c = a.characteristics;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>{a.filename}</h1>
        <span className="mono dim">{fmt(a.duration)} · {a.sample_rate} Hz · {a.channels} ch</span>
      </header>
      <Waveform peaks={peaks} analysis={a} currentBar={currentBar} playTime={a.stems.mix ? stemTime : null}
        onBar={(b) => setState({ currentBar: b })} onSeek={(t) => a.stems.mix && seekStems(t)} />
      <section className="panel" data-tour="sections">
        <h2>{t("Структура трека", "Track structure")} <small>{t("нажми на блок — он заиграет", "click a block to play it")}</small></h2>
        <SectionStrip analysis={a} recipe={recipe} showPlay={!!a.stems.mix} playingIndex={stemPlaying ? playingSection(audioTag) : null}
          onPick={(i) => a.stems.mix && void toggleSection(a.sections[i], i)} />
        <div className="legend" style={{ marginTop: 10 }}>{SECTION_LEGEND.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>
      </section>
      {!a.stems.mix && <p className="hint">{t("Воспроизведение недоступно для этого анализа — открой трек заново.", "Playback is not available for this analysis — open the track again.")}</p>}
      <div className="bpm-panel" data-tour="bpm">
        <div className="bpm-big"><span className="k">BPM</span><b>{a.grid.bpm.toFixed(1)}</b></div>
        <button className="btn" onClick={halveBpm}>÷2</button>
        <button className="btn" onClick={doubleBpm}>×2</button>
        <button className="btn" onClick={() => {
          const v = window.prompt("BPM", a.grid.bpm.toFixed(2)); const n = v ? parseFloat(v) : NaN;
          if (n >= 40 && n <= 260) void setGrid({ bpm: n });
        }}>{t("Править", "Edit")}</button>
        <span className="k">{t("ПЕРВАЯ ДОЛЯ", "FIRST BEAT")}</span>
        <button className="btn sm" title={t("Сдвинуть шаг 1 на долю раньше", "Move step 1 one beat earlier")} onClick={() => nudgeDownbeat(-1)}>{t("◀ Доля", "◀ Beat")}</button>
        <button className="btn sm" title={t("Сдвинуть шаг 1 на долю позже", "Move step 1 one beat later")} onClick={() => nudgeDownbeat(1)}>{t("Доля ▶", "Beat ▶")}</button>
        <button className="btn sm" title={t("Сдвинуть шаг 1 на шестнадцатую раньше", "Move step 1 one 16th earlier")} onClick={() => nudgeStep(-1)}>{t("◀ Шаг", "◀ Step")}</button>
        <button className="btn sm" title={t("Сдвинуть шаг 1 на шестнадцатую позже", "Move step 1 one 16th later")} onClick={() => nudgeStep(1)}>{t("Шаг ▶", "Step ▶")}</button>
        <span className="k">{t("КВАНТАЙЗ", "QUANTIZE")}</span>
        <div className="seg">{[4, 8, 16, 32].map((r) => (
          <button key={r} className={`btn sm ${a.resolution === r ? "on" : ""}`} onClick={() => setGrid({}, r)}>1/{r}</button>
        ))}</div>
        <span className="k">{t("УВЕРЕННОСТЬ В ТЕМПЕ", "TEMPO CONFIDENCE")}</span><b className={`mono ${a.grid.confidence < 0.4 ? "warn" : ""}`}>{(a.grid.confidence * 100).toFixed(0)}%</b>
      </div>
      {a.grid.candidates.length > 0 && <p className="hint">{t("Другие вероятные значения", "Other likely values")}: {a.grid.candidates.map((c) => (
        <button key={c} className="link" onClick={() => setGrid({ bpm: c })}>{c}</button>))}</p>}
      <div className="grid2">
        <section className="panel" data-tour="explain">
          <h2>{t("Что нашёл анализ", "What the analysis found")} <small>{t("словами, не цифрами", "in words, not numbers")}</small></h2>
          <p className="hint">{t("Темп, жанр, структура, бас и ударные — с честной оценкой уверенности. Цифры — в «Подробностях».", "Tempo, style, structure, bass and drums — with an honest confidence level. The numbers are under Details.")}</p>
          <button className="btn primary" onClick={() => setState({ screen: "learn" })}>{t("Учить этот трек ▸", "Learn this track ▸")}</button>
          {" "}<button className="btn" disabled={busy === "spsystem"} title={t("Сохранить трек и анализ в формате SP SYSTEM (.spsystem) для SP404 DROP", "Save the track and its analysis as an SP SYSTEM file (.spsystem) for SP404 DROP")} onClick={() => void prepareInDrop()}>{busy === "spsystem" ? t("Готовлю…", "Preparing…") : t("Подготовить в DROP →", "Prepare in DROP →")}</button>
          <details className="explain-details"><summary>{t("Сырые измерения (экспериментально)", "Raw measurements (experimental)")}</summary>
          <table className="kv"><tbody>
            {[[t("Бочек / такт", "Kicks / bar"), c.kick_density], [t("Снейр+клэп / такт", "Snare+clap / bar"), c.snare_density], [t("Хэтов / такт", "Hats / bar"), c.hat_density], [t("Перк. / такт", "Perc. / bar"), c.perc_density],
              [t("Синкопа", "Syncopation"), c.syncopation, true], [t("Четыре в пол", "Four on the floor"), c.four_on_floor, true], [t("Разброс тайминга, мс", "Timing spread, ms"), c.timing_variation_ms]]
              .map(([k, v, pct]) => <tr key={k as string}><td>{k as string}</td><td className="mono">{pct ? `${((v as number) * 100).toFixed(0)}%` : (v as number).toFixed(1)}</td></tr>)}
          </tbody></table>
          <p className="hint">{t("«Синкопа» и «четыре в пол» пока не используются для советов: на реальных треках они не различают жанры.", "“Syncopation” and “four on the floor” aren't used for advice yet: on real tracks they don't separate genres.")}</p>
          </details>
        </section>
        {a.genre?.available && a.genre.candidates?.length ? <GenreCard a={a} /> : (
          <>
            <section className="panel">
              <h2>{t("Вероятный стиль", "Likely style")} <small>{t("подсказка, не вердикт", "a hint, not a verdict")}</small></h2>
              {a.likely_styles.map((s) => (
                <div key={s.style} className="style"><span>{engineText(s.style)}</span><div className="meter"><i style={{ width: `${s.score * 100}%` }} /></div><small>{engineText(s.why)}</small></div>
              ))}
              <p className="hint">{t("Грубая оценка по темпу и ритму — не жанр.", "A rough guess from tempo and rhythm — not a genre.")}</p>
            </section>
            {a.genre?.reason === "pack_missing" && <GenrePackHint />}
          </>
        )}
      </div>
      <div className="explain-grid" data-tour="explain-cards">
        {explainTrack(a, 0.3).filter((c) => c.id !== "style").map((c) => <ExplainCard key={c.id} card={c} onAlt={(b) => void setGrid({ bpm: b })} />)}
      </div>
      {a.warnings.length > 0 && <section className="panel warnbox"><h2>{t("ЗАМЕТКИ", "NOTES")}</h2>{a.warnings.map((w, i) => <p key={i}>{engineText(w)}</p>)}</section>}
    </div>
  );
}
