import { PAD_ROWS, VOICE_COLORS, VOICE_LABELS } from "../lib/voices";

interface Props {
  kit: Record<number, string>;
  highlighted?: number | null;
  selected?: number | null;
  /** pads that are used by the current pattern (drawn brighter) */
  active?: number[];
  onPad?: (pad: number) => void;
}

/** Strict 4×4 CSS grid in the SP-404MKII physical order: pad 1 bottom-left, 13 top-left.
 *  Every pad is its own grid cell — nothing is positioned over the pads. */
export function SP404PadGrid({ kit, highlighted, selected, active = [], onPad }: Props) {
  return (
    <div className="pad-grid" role="grid" aria-label="SP-404MKII pads">
      {PAD_ROWS.flat().map((n) => {
        const voice = kit[n];
        const color = VOICE_COLORS[voice] ?? "#888";
        const cls = ["pad", highlighted === n ? "hl" : "", selected === n ? "sel" : "", active.includes(n) ? "act" : ""].join(" ");
        return (
          <button key={n} className={cls} style={{ ["--c" as string]: color }} onClick={() => onPad?.(n)} data-pad={n}
            aria-label={`Pad ${n} ${voice ?? "empty"}`} disabled={!onPad}>
            <span className="pad-n">{n}</span>
            <span className="pad-l">{VOICE_LABELS[voice] ?? ""}</span>
          </button>
        );
      })}
    </div>
  );
}
