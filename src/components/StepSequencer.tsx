import { useState } from "react";
import { VOICE_COLORS, VOICE_LABELS } from "../lib/voices";

export interface Cell { id?: string; confidence?: number; velocity?: number; manual?: boolean }
interface Props {
  voices: string[];
  /** voice → step(1-based) → cell */
  cells: Record<string, Record<number, Cell>>;
  stepsPerBar?: number;
  playStep?: number;           // 0-based, -1 = none (only meaningful for 16)
  selectedId?: string | null;
  highlight?: number[];        // tutorial: steps to emphasise
  focusVoice?: string | null;
  lowConfidence?: number;
  readOnly?: boolean;
  onToggle?: (voice: string, step: number, cell?: Cell) => void;
  onSelect?: (id: string) => void;
  onMenu?: (voice: string, step: number, cell: Cell, x: number, y: number) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function StepSequencer({ voices, cells, stepsPerBar = 16, playStep = -1, selectedId, highlight = [], focusVoice,
  lowConfidence = 0.5, readOnly, onToggle, onSelect, onMenu }: Props) {
  const blocks: number[][] = [];
  for (let i = 0; i < stepsPerBar; i += 8) blocks.push(Array.from({ length: Math.min(8, stepsPerBar - i) }, (_, k) => i + k + 1));
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="seq">
      {blocks.map((cols, bi) => (
        <div className="seq-block" key={bi}>
          <div className="seq-row seq-head">
            <div className="seq-label" />
            {cols.map((s) => <div key={s} className={`seq-num ${playStep + 1 === s ? "now" : ""} ${(s - 1) % 4 === 0 ? "beat" : ""}`}>{pad2(s)}</div>)}
          </div>
          {voices.map((v) => (
            <div className={`seq-row ${focusVoice && focusVoice !== v ? "dim" : ""}`} key={v}>
              <div className="seq-label"><i style={{ background: VOICE_COLORS[v] }} />{VOICE_LABELS[v] ?? v}</div>
              {cols.map((s) => {
                const cell = cells[v]?.[s];
                const low = cell && cell.confidence !== undefined && cell.confidence < lowConfidence;
                const cls = ["cell", (s - 1) % 4 === 0 ? "beat" : "", cell ? "on" : "", low ? "low" : "", cell?.id && cell.id === selectedId ? "sel" : "",
                  highlight.includes(s) && cell ? "hl" : "", playStep + 1 === s ? "now" : "", cell?.manual ? "manual" : ""].join(" ");
                return (
                  <button key={s} className={cls} style={{ ["--c" as string]: VOICE_COLORS[v], ["--v" as string]: String(cell?.velocity ?? 0.8) }}
                    disabled={readOnly}
                    aria-label={`${VOICE_LABELS[v] ?? v} step ${s}${cell ? " on" : " off"}`}
                    title={cell?.confidence !== undefined && !cell.manual ? `confidence ${(cell.confidence * 100).toFixed(0)}%` : undefined}
                    onMouseEnter={() => setHover(`${v}${s}`)} onMouseLeave={() => setHover(null)}
                    onClick={() => (cell?.id ? onSelect?.(cell.id) : onToggle?.(v, s, cell))}
                    onDoubleClick={() => cell && !cell.id && onToggle?.(v, s, cell)}
                    onContextMenu={(e) => { if (cell) { e.preventDefault(); onMenu?.(v, s, cell, e.clientX, e.clientY); } }}>
                    {cell ? (low ? "?" : "●") : hover === `${v}${s}` && !readOnly ? "+" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
