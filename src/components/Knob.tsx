/** Shared rotary control language (SP SYSTEM). Display-only: it explains a control, it does not simulate audio. */
export interface KnobProps {
  label: string;
  /** 0..1 pointer position */
  value?: number;
  /** printed under the knob, e.g. "0.230–0.012 s" */
  range?: string;
  /** hardware knob it lives on, only when verified (e.g. "CTRL 1") */
  ctrl?: string | null;
  highlighted?: boolean;
  size?: number;
}

export function Knob({ label, value = 0.5, range, ctrl, highlighted, size = 64 }: KnobProps) {
  const angle = -135 + 270 * Math.max(0, Math.min(1, value));
  const ticks = Array.from({ length: 11 }, (_, i) => -135 + (270 * i) / 10);
  return (
    <figure className={`sp-knob ${highlighted ? "hl" : ""}`} aria-label={`${label}${range ? `, ${range}` : ""}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        {ticks.map((t, i) => (
          <line key={i} x1="32" y1="3" x2="32" y2={i % 5 === 0 ? 9 : 7} stroke="currentColor" strokeWidth="2" transform={`rotate(${t} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="19" fill="var(--sp-white)" stroke="currentColor" strokeWidth="3" />
        <g transform={`rotate(${angle} 32 32)`}><line x1="32" y1="32" x2="32" y2="17" stroke="currentColor" strokeWidth="4" strokeLinecap="square" /></g>
        <circle cx="32" cy="32" r="3" fill="currentColor" />
      </svg>
      <figcaption>
        <b>{label}</b>
        {range && <span className="mono">{range}</span>}
        {ctrl && <span className="chip">{ctrl}</span>}
      </figcaption>
    </figure>
  );
}
