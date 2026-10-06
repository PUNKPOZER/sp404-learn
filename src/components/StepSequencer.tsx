import { VOICE_COLORS, VOICE_LABELS } from "../lib/voices";
import { t } from "../lib/i18n";

export interface Cell { id?: string; confidence?: number; velocity?: number; manual?: boolean; label?: string }
interface Props {
  voices: string[];
  /** voice → step(1-based) → cell */
  cells: Record<string, Record<number, Cell>>;
  stepsPerBar?: number;
  playStep?: number;           // 0-based, -1 = none
  selectedId?: string | null;
  highlight?: number[];        // tutorial: steps to emphasise
  focusVoice?: string | null;
  lowConfidence?: number;
  readOnly?: boolean;
  compact?: boolean;
  onToggle?: (voice: string, step: number, cell?: Cell) => void;
  onSelect?: (id: string) => void;
  onMenu?: (voice: string, step: number, cell: Cell, x: number, y: number) => void;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** One bar, 16 steps per row grouped by beat (4 × 4). Bars with a finer grid wrap to extra rows. */
export function StepSequencer({ voices, cells, stepsPerBar = 16, playStep = -1, selectedId, highlight = [], focusVoice,
  lowConfidence = 0.5, readOnly, compact, onToggle, onSelect, onMenu }: Props) {
  const rows: number[][] = [];
  const per = Math.min(16, stepsPerBar);
  for (let i = 0; i < stepsPerBar; i += per) rows.push(Array.from({ length: Math.min(per, stepsPerBar - i) }, (_, k) => i + k + 1));
  const groupOf = (cols: number[]) => { const g: number[][] = []; for (let i = 0; i < cols.length; i += 4) g.push(cols.slice(i, i + 4)); return g; };

  return (
    <div className={`seq ${compact ? "compact" : ""}`}>
      {rows.map((cols, bi) => (
        <div className="seq-block" key={bi}>
          <div className="seq-row seq-head">
            <div className="seq-label" />
            {groupOf(cols).map((g, gi) => (
              <div className="seq-grp" key={gi}>
                {g.map((s) => <div key={s} className={`seq-num ${playStep + 1 === s ? "now" : ""} ${(s - 1) % 4 === 0 ? "beat" : ""}`}>{pad2(s)}</div>)}
              </div>
            ))}
          </div>
          {voices.map((v) => (
            <div className={`seq-row ${focusVoice && focusVoice !== v ? "dim" : ""}`} key={v}>
              <div className="seq-label"><i style={{ background: VOICE_COLORS[v] }} />{VOICE_LABELS[v] ?? v}</div>
              {groupOf(cols).map((g, gi) => (
                <div className="seq-grp" key={gi}>
                  {g.map((s) => {
                    const cell = cells[v]?.[s];
                    const low = cell && cell.confidence !== undefined && cell.confidence < lowConfidence;
                    const cls = ["cell", cell ? "on" : "", low ? "low" : "", cell?.id && cell.id === selectedId ? "sel" : "",
                      highlight.includes(s) && cell ? "hl" : "", playStep + 1 === s ? "now" : "", cell?.manual ? "manual" : ""].join(" ");
                    return (
                      <button key={s} className={cls} style={{ ["--c" as string]: VOICE_COLORS[v], ["--v" as string]: String(cell?.velocity ?? 0.8) }}
                        disabled={readOnly}
                        aria-label={`${VOICE_LABELS[v] ?? v} ${t("шаг", "step")} ${s}${cell ? t(" вкл", " on") : t(" выкл", " off")}`}
                        title={cell?.confidence !== undefined && !cell.manual ? `${t("уверенность", "confidence")} ${(cell.confidence * 100).toFixed(0)}%` : undefined}
                        onClick={() => (cell?.id ? onSelect?.(cell.id) : onToggle?.(v, s, cell))}
                        onContextMenu={(e) => { if (cell) { e.preventDefault(); onMenu?.(v, s, cell, e.clientX, e.clientY); } }}>
                        {cell ? (low ? "?" : cell.label ?? "") : ""}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
