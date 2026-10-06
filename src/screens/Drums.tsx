import { useMemo, useState } from "react";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { Waveform } from "../components/Waveform";
import { toggleAudio } from "../lib/audio/stemPlayer";
import { sectionColor, mmss } from "../lib/sections";
import { togglePlay } from "../lib/audio/preview";
import type { DrumType } from "../lib/types";
import { DRUM_ROWS, VOICE_LABELS } from "../lib/voices";
import { addEvent, deleteEvent, moveEvent, updateEvent } from "../state/actions";
import { setState, useStore } from "../state/store";
import { t } from "../lib/i18n";

export function Drums() {
  const { analysis: a, currentBar, selectedEventId, minConfidence, playStep, peaks, audioTag, stemPlaying, playing } = useStore((s) => s);
  const [tool, setTool] = useState<DrumType>("KICK");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const res = a?.resolution ?? 16;
  const cells = useMemo(() => {
    const out: Record<string, Record<number, Cell>> = {};
    if (a) for (const e of a.events) if (e.bar === currentBar) {
      const st = Math.floor((e.step * 16) / res) + 1;
      (out[e.type] ??= {})[st] = { id: e.id, confidence: e.confidence, velocity: e.velocity, manual: e.manual };
    }
    return out;
  }, [a, currentBar, res]);
  if (!a) return null;
  const nBars = Math.max(1, a.events.reduce((m, e) => Math.max(m, e.bar), 0) + 1);
  const toStep = (s16: number) => Math.round(((s16 - 1) * res) / 16);   // grid column → stored step
  const sel = a.events.find((e) => e.id === selectedEventId);
  const barDur = (60 / a.grid.bpm) * 4;
  const t0 = a.grid.origin + currentBar * barDur;
  const section = a.sections.find((s) => t0 + 0.01 >= s.start && t0 < s.end) ?? a.sections[a.sections.length - 1];
  const inBar = a.events.filter((e) => e.bar === currentBar);
  const shown = inBar.filter((e) => e.confidence >= minConfidence).length;
  const stemTag = `drums-bar:${currentBar}`;
  const stemOn = stemPlaying && audioTag === stemTag;

  return (
    <div className="screen" onClick={() => setMenu(null)} tabIndex={0} onKeyDown={(e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && sel && (e.target as HTMLElement).tagName !== "INPUT") deleteEvent(sel.id);
    }}>
      <header className="screen-head">
        <h1>{t("Ударные", "Drums")}</h1>
        <div className="bar-nav">
          <button className="btn sm" disabled={currentBar === 0} onClick={() => setState({ currentBar: currentBar - 1 })}>◀</button>
          <b className="mono">{t("Такт", "Bar")} {currentBar + 1} / {nBars}</b>
          <button className="btn sm" disabled={currentBar >= nBars - 1} onClick={() => setState({ currentBar: currentBar + 1 })}>▶</button>
        </div>
        {section && <span className="chip solid" style={{ ["--c" as string]: sectionColor(section) }}>{section.label}</span>}
        <span className="mono dim">{mmss(Math.max(0, t0))} – {mmss(Math.max(0, t0 + barDur))} {t("в треке", "in the track")}</span>
        <div className="grow" />
        <button className={`btn ${playing && !stemPlaying ? "on" : ""}`} onClick={togglePlay} title={t("Проиграть этот такт синтезатором по кругу", "Loop this bar on the synth")}>{playing && !stemPlaying ? t("■ Синтезатор", "■ Synth") : t("▶ Синтезатор", "▶ Synth")}</button>
        <button className={`btn ${stemOn ? "on" : ""}`} disabled={!a.stems.drums} onClick={() => void toggleAudio("drums", { from: Math.max(0, t0), to: t0 + barDur, tag: stemTag })}
          title={a.stems.drums ? t("Послушать оригинальные ударные этого такта (стем)", "Listen to the original drums of this bar (stem)") : t("Нужны стемы — скачай модель в Настройках", "Needs stems — download the model in Settings")}>{stemOn ? t("■ Стем ударных", "■ Drum stem") : t("▶ Стем ударных", "▶ Drum stem")}</button>
      </header>
      <section className="panel" data-tour="where">
        <h2>{t("Где этот такт в треке", "Where this bar is in the track")} <small>{t("клик по волне — перейти к такту", "click the waveform to jump to a bar")}</small></h2>
        <Waveform peaks={peaks} analysis={a} currentBar={currentBar} onBar={(b) => setState({ currentBar: b })} height={84} />
      </section>
      <section className="panel" data-tour="drum-grid">
        <div className="drum-tools">
          <label className="inline">{t("Добавлять клик как", "Add clicks as")} <select value={tool} onChange={(e) => setTool(e.target.value as DrumType)}>{DRUM_ROWS.map((v) => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}</select></label>
          <label className="inline" title={t("События с уверенностью ниже порога скрываются: они не играются и не попадают в рецепт", "Events below the threshold are hidden: they are not played and not included in the recipe")}>
            {t("Порог уверенности", "Confidence threshold")}
            <input type="range" min={0} max={90} value={minConfidence * 100} onChange={(e) => setState({ minConfidence: +e.target.value / 100 })} />
            <b className="mono">{(minConfidence * 100).toFixed(0)}%</b>
          </label>
          <span className="chip soft">{t("показано", "showing")} {shown} {t("из", "of")} {inBar.length} {t("событий в такте", "events in the bar")}</span>
        </div>
        <StepSequencer voices={DRUM_ROWS} cells={cells} playStep={playStep} selectedId={selectedEventId} lowConfidence={0.5}
          onToggle={(v, s) => addEvent(currentBar, toStep(s), (v as DrumType) ?? tool)}
          onSelect={(id) => setState({ selectedEventId: id })}
          onMenu={(_v, _s, cell, x, y) => { if (cell.id) { setState({ selectedEventId: cell.id }); setMenu({ id: cell.id, x, y }); } }} />
        <p className="hint">{t("Клик по пустой клетке — добавить удар · клик по удару — выбрать (справа появятся настройки) · правый клик — меню · Delete — удалить. Полосатая клетка — алгоритм не уверен; ползунок «Порог уверенности» скрывает такие удары.", "Click an empty cell to add a hit · click a hit to select it (settings appear on the right) · right-click for a menu · Delete removes. A striped cell means the algorithm is unsure; the “Confidence threshold” slider hides such hits.")}</p>
        {sel && (
          <div className="move-row"><span className="k">{t("ВЫБРАННЫЙ УДАР", "SELECTED HIT")}</span>
            <button className="btn sm" onClick={() => moveEvent(sel.id, Math.max(0, sel.step - 1))}>{t("◀ на шаг", "◀ one step")}</button>
            <button className="btn sm" onClick={() => moveEvent(sel.id, Math.min(res - 1, sel.step + 1))}>{t("на шаг ▶", "one step ▶")}</button></div>
        )}
      </section>
      {menu && (
        <div className="ctx" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="ctx-h">{t("СМЕНИТЬ ИНСТРУМЕНТ", "CHANGE INSTRUMENT")}</div>
          {DRUM_ROWS.map((v) => <button key={v} onClick={() => { updateEvent(menu.id, { type: v as DrumType }); setMenu(null); }}>{VOICE_LABELS[v]}</button>)}
          <button className="danger" onClick={() => { deleteEvent(menu.id); setMenu(null); }}>{t("Удалить", "Delete")}</button>
        </div>
      )}
    </div>
  );
}
