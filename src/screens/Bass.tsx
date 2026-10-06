import { useMemo } from "react";
import { Waveform } from "../components/Waveform";
import { mmss } from "../lib/sections";
import { setState, useStore } from "../state/store";
import { noteName } from "../lib/voices";
import { toggleAudio } from "../lib/audio/stemPlayer";
import { togglePlay } from "../lib/audio/preview";
import { t } from "../lib/i18n";

export function Bass() {
  const { analysis: a, currentBar, playing, stemPlaying, audioTag, peaks, stemTime } = useStore((s) => s);
  const marks = useMemo(() => (a ? a.bass.map((b) => b.time) : []), [a]);
  const notes = useMemo(() => (a ? a.bass.filter((b) => b.bar === currentBar) : []), [a, currentBar]);
  if (!a) return null;
  const nBars = Math.max(1, a.bass.reduce((m, b) => Math.max(m, b.bar), 0) + 1);
  const used = [...new Set(notes.map((n) => n.midi))].sort((x, y) => y - x);
  const lo = used.length ? Math.min(...used) - 1 : 28, hi = used.length ? Math.max(...used) + 1 : 40;
  const rows = Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
  const stepDur = (60 / a.grid.bpm) / 4;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>{t("Бас", "Bass")}</h1>
        <div className="bar-nav">
          <button className="btn sm" disabled={currentBar === 0} onClick={() => setState({ currentBar: currentBar - 1 })}>◀</button>
          <b className="mono">{t("Такт", "Bar")} {currentBar + 1} / {nBars}</b>
          <button className="btn sm" disabled={currentBar >= nBars - 1} onClick={() => setState({ currentBar: currentBar + 1 })}>▶</button>
        </div>
        <span className="chip">{a.stems_model ? t("из стема баса", "from the bass stem") : t("из полного микса · приблизительно", "from the full mix · approximate")}</span>
        <div className="grow" />
        <button className={`btn ${playing && !stemPlaying ? "on" : ""}`} onClick={togglePlay} title={t("Сыграть найденные ноты этого такта синтезатором (слышно только бас)", "Play the detected notes of this bar on the synth (bass only)")}>
          {playing && !stemPlaying ? t("■ Синтезатор", "■ Synth") : t("▶ Синтезатор", "▶ Synth")}</button>
        <button className={`btn ${stemPlaying && audioTag === `bass-bar:${currentBar}` ? "on" : ""}`} disabled={!a.stems.bass}
          title={a.stems.bass ? t("Послушать оригинальный бас этого такта (стем)", "Listen to the original bass of this bar (stem)") : t("Нужны стемы — скачай модель в Настройках", "Needs stems — download the model in Settings")}
          onClick={() => { const bar = (60 / a.grid.bpm) * 4, t0 = Math.max(0, a.grid.origin + currentBar * bar); void toggleAudio("bass", { from: t0, to: t0 + bar, tag: `bass-bar:${currentBar}` }); }}>
          {stemPlaying && audioTag === `bass-bar:${currentBar}` ? t("■ Оригинал баса", "■ Original bass") : t("▶ Оригинал баса", "▶ Original bass")}</button>
      </header>
      {a.bass.length > 0 && (
        <section className="panel">
          <h2>{t("Где бас в треке", "Where the bass is")} <small>{t("полоски — начало каждой ноты · клик по волне — перейти к такту", "ticks mark note starts · click the waveform to jump to a bar")}</small></h2>
          <Waveform peaks={a.stems.bass?.peaks?.length ? a.stems.bass.peaks : peaks} analysis={a} currentBar={currentBar}
            markers={marks} markerColor="#FF2A1A" height={92} onBar={(b) => setState({ currentBar: b })}
            playTime={stemPlaying && audioTag?.startsWith("bass-bar") ? stemTime : null} />
          <p className="hint">{t("Бас входит в такте", "Bass enters at bar")} <b>{a.bass[0].bar + 1}</b> ({mmss(a.bass[0].time)}) · {t("нот в треке", "notes in the track")}: <b>{a.bass.length}</b>.</p>
        </section>
      )}
      {a.bass.length === 0 ? (
        <section className="panel"><h2>{t("Басовые ноты не найдены", "No bass notes found")}</h2><p>{t("В басовом регистре ничего не найдено. Если в треке есть бас, скачай модель стемов в Настройках и проанализируй заново.", "Nothing was found in the bass register. If the track has bass, download the stem model in Settings and analyse again.")}</p></section>
      ) : (
        <>
          <section className="panel" data-tour="roll">
            <div className="roll">
              {rows.map((m) => (
                <div key={m} className={`roll-row ${[1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12) ? "black" : ""}`}>
                  <span className="roll-key">{noteName(m)}</span>
                  <div className="roll-lane">
                    {notes.filter((n) => n.midi === m).map((n, i) => (
                      <i key={i} className="roll-note" style={{ left: `${(n.step / 16) * 100}%`, width: `${Math.max(3, (n.duration / (stepDur * 16)) * 100)}%`, opacity: 0.45 + n.confidence * 0.55 }}
                        title={`${noteName(n.midi)} · ${t("шаг", "step")} ${n.step + 1} · ${(n.confidence * 100).toFixed(0)}%`}>{noteName(n.midi)}</i>
                    ))}
                  </div>
                </div>
              ))}
              <div className="roll-axis">{Array.from({ length: 16 }, (_, i) => <span key={i} className={i % 4 === 0 ? "beat" : ""}>{String(i + 1).padStart(2, "0")}</span>)}</div>
            </div>
          </section>
          <section className="panel">
            <h2>{t("Ноты в этом такте", "Notes in this bar")}</h2>
            {notes.length === 0 ? <p className="hint">{t("Тихий такт.", "Quiet bar.")}</p> : (
              <table className="kv"><thead><tr><th>{t("Нота", "Note")}</th><th>{t("Шаг", "Step")}</th><th>{t("Длина", "Length")}</th><th>{t("Уверенность", "Confidence")}</th></tr></thead><tbody>
                {notes.map((n, i) => <tr key={i}><td className="mono">{noteName(n.midi)}</td><td className="mono">{n.step + 1}</td>
                  <td className="mono">{(n.duration * 1000).toFixed(0)} ms</td><td className={`mono ${n.confidence < 0.5 ? "warn" : ""}`}>{(n.confidence * 100).toFixed(0)}%</td></tr>)}
              </tbody></table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
