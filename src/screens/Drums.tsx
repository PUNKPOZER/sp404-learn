import { useMemo, useState } from "react";
import { StepSequencer, type Cell } from "../components/StepSequencer";
import { Waveform } from "../components/Waveform";
import type { DrumType } from "../lib/types";
import { DRUM_ROWS, VOICE_LABELS } from "../lib/voices";
import { addEvent, deleteEvent, moveEvent, updateEvent } from "../state/actions";
import { setState, useStore } from "../state/store";

export function Drums() {
  const { analysis: a, currentBar, selectedEventId, minConfidence, playStep, peaks } = useStore((s) => s);
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
  const hidden = a.events.filter((e) => e.bar === currentBar && e.confidence < minConfidence).length;

  return (
    <div className="screen" onClick={() => setMenu(null)} tabIndex={0} onKeyDown={(e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && sel && (e.target as HTMLElement).tagName !== "INPUT") deleteEvent(sel.id);
    }}>
      <header className="screen-head">
        <h1>Ударные</h1>
        <div className="bar-nav">
          <button className="btn sm" disabled={currentBar === 0} onClick={() => setState({ currentBar: currentBar - 1 })}>◀</button>
          <b className="mono">ТАКТ {currentBar + 1} / {nBars}</b>
          <button className="btn sm" disabled={currentBar >= nBars - 1} onClick={() => setState({ currentBar: currentBar + 1 })}>▶</button>
        </div>
        <span className="k">ДОБАВЛЯТЬ КАК</span>
        <select value={tool} onChange={(e) => setTool(e.target.value as DrumType)}>{DRUM_ROWS.map((v) => <option key={v} value={v}>{VOICE_LABELS[v]}</option>)}</select>
        <span className="k">МИН. УВЕРЕННОСТЬ</span>
        <input type="range" min={0} max={90} value={minConfidence * 100} onChange={(e) => setState({ minConfidence: +e.target.value / 100 })} />
        <b className="mono">{(minConfidence * 100).toFixed(0)}%</b>
      </header>
      <Waveform peaks={peaks} analysis={a} currentBar={currentBar} onBar={(b) => setState({ currentBar: b })} height={70} />
      <StepSequencer voices={DRUM_ROWS} cells={cells} stepsPerBar={16} playStep={playStep} selectedId={selectedEventId} lowConfidence={0.5}
        onToggle={(v, s) => addEvent(currentBar, toStep(s), (v as DrumType) ?? tool)}
        onSelect={(id) => setState({ selectedEventId: id })}
        onMenu={(_v, _s, cell, x, y) => { if (cell.id) { setState({ selectedEventId: cell.id }); setMenu({ id: cell.id, x, y }); } }} />
      <p className="hint">Клик по пустой клетке добавляет инструмент · клик по событию выделяет · правый клик — действия · Delete удаляет.
        <b> ?</b> = низкая уверенность.{hidden > 0 && ` ${hidden} событий в этом такте ниже порога уверенности (не играются и не попадают в рецепт).`}</p>
      {sel && (
        <div className="move-row"><span className="k">СДВИНУТЬ ВЫБРАННОЕ</span>
          <button className="btn sm" onClick={() => moveEvent(sel.id, Math.max(0, sel.step - 1))}>◀ Шаг</button>
          <button className="btn sm" onClick={() => moveEvent(sel.id, Math.min(res - 1, sel.step + 1))}>Шаг ▶</button></div>
      )}
      {menu && (
        <div className="ctx" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="ctx-h">СМЕНИТЬ ИНСТРУМЕНТ</div>
          {DRUM_ROWS.map((v) => <button key={v} onClick={() => { updateEvent(menu.id, { type: v as DrumType }); setMenu(null); }}>{VOICE_LABELS[v]}</button>)}
          <button className="danger" onClick={() => { deleteEvent(menu.id); setMenu(null); }}>УДАЛИТЬ</button>
        </div>
      )}
    </div>
  );
}
