import { PadGrid, type PadGridProps } from "./SP404PadGrid";

/** Controls that exist on the SP-404MKII and appear in verified Roland procedures. Layout is schematic, NOT to scale. */
export const CONTROL_GROUPS = {
  knobs: ["CTRL 1", "CTRL 2", "CTRL 3", "VALUE"],
  fx: ["FILTER+DRIVE", "RESONATOR", "DELAY", "ISOLATOR", "DJFX LOOPER", "MFX"],
  keys: ["PATTERN SELECT", "REC", "REMAIN", "SUB PAD", "SHIFT", "HOLD", "MARK", "RESAMPLE", "DEL", "EXIT"],
} as const;
export type ControlId = (typeof CONTROL_GROUPS)[keyof typeof CONTROL_GROUPS][number];

const norm = (s: string) => s.replace(/[[\]]/g, "").trim().toUpperCase();

interface Props extends Omit<PadGridProps, "className"> {
  highlightPads?: number[];
  highlightControls?: string[];
  /** text on the little display */
  display?: string;
  compact?: boolean;
}

/** Reusable simplified vector SP-404MKII: display, CTRL knobs, VALUE, key buttons, 16 pads. Highlights use red + a dot, never colour alone. */
export function DeviceDiagram({ highlightPads, highlightControls = [], display = "SP-404MKII", compact, ...pad }: Props) {
  const hl = new Set(highlightControls.map(norm));
  const btn = (id: string, extra = "") => (
    <span key={id} className={`dev-btn ${extra} ${hl.has(id) ? "hl" : ""}`} data-control={id} aria-label={hl.has(id) ? `${id}, highlighted` : id}>{id}</span>
  );
  return (
    <figure className={`device ${compact ? "compact" : ""}`} aria-label="Simplified SP-404MKII diagram">
      <div className="dev-main">
        <div className="dev-display" aria-hidden>{display}</div>
        <div className="dev-knobs">
          {CONTROL_GROUPS.knobs.map((k) => (
            <span key={k} className={`dev-knob ${hl.has(k) ? "hl" : ""}`} data-control={k} aria-label={hl.has(k) ? `${k}, highlighted` : k}>
              <i /> <em>{k}</em>
            </span>
          ))}
        </div>
        <div className="dev-row fx">{CONTROL_GROUPS.fx.map((c) => btn(c, "fx"))}</div>
        <div className="dev-row keys">{CONTROL_GROUPS.keys.map((c) => btn(c))}</div>
      </div>
      <div className="dev-pads"><PadGrid {...pad} highlighted={highlightPads ?? pad.highlighted} /></div>
      <figcaption>Simplified diagram — not to scale</figcaption>
    </figure>
  );
}
