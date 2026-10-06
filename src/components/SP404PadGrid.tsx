import { PAD_ROWS, VOICE_LABELS } from "../lib/voices";

export interface PadGridProps {
  /** pad number → voice key (labels come from VOICE_LABELS unless `labels` overrides) */
  kit?: Record<number, string>;
  labels?: Record<number, string>;
  /** pads to emphasise in a lesson (red + dot marker, never colour alone) */
  highlighted?: number | number[] | null;
  selected?: number | null;
  /** pads in use (blue underline) */
  active?: number[];
  /** optional step state: pad number → lit */
  steps?: Record<number, boolean>;
  bank?: string;
  onPad?: (pad: number) => void;
  className?: string;
}

/** THE 4×4 pad grid for the whole product (recipe, lessons, device diagram, chop). Strict CSS grid, SP-404MKII physical order:
 *  pad 1 bottom-left … pad 16 top-right. One grid cell per pad; nothing is positioned over the pads. */
export function PadGrid({ kit = {}, labels, highlighted, selected, active = [], steps, bank, onPad, className = "" }: PadGridProps) {
  const hl = new Set(Array.isArray(highlighted) ? highlighted : highlighted != null ? [highlighted] : []);
  return (
    <div className={`pad-grid ${className}`} role="grid" aria-label={bank ? `SP-404MKII pads, bank ${bank}` : "SP-404MKII pads"}>
      {PAD_ROWS.flat().map((n) => {
        const label = labels?.[n] ?? (kit[n] ? VOICE_LABELS[kit[n]] ?? kit[n] : "");
        const cls = ["pad", hl.has(n) ? "hl" : "", selected === n ? "sel" : "", active.includes(n) ? "act" : ""].join(" ");
        return (
          <button key={n} className={cls} onClick={() => onPad?.(n)} data-pad={n} disabled={!onPad}
            aria-label={`Pad ${n}${label ? ` ${label}` : ""}${hl.has(n) ? ", highlighted" : ""}`} aria-pressed={selected === n}>
            {steps && <span className={`pad-s ${steps[n] ? "on" : ""}`} aria-hidden />}
            <span className="pad-n">{n}</span>
            <span className="pad-l">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Back-compat wrapper for existing call sites (kit-based, single highlighted pad). */
export function SP404PadGrid(props: PadGridProps) { return <PadGrid {...props} />; }
