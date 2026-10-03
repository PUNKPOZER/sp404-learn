/** SP-404 LEARN mark: a rounded 4×4 pad grid with a lit pattern, plus a rounded wordmark. */
const LIT: Record<string, string> = { "0,2": "#a89bff", "1,0": "#ff7a6b", "1,3": "#ffc15e", "2,1": "#5ef2c0", "3,0": "#ff7a6b", "3,2": "#5cc8ff" };

export function LogoMark({ size = 40 }: { size?: number }) {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    cells.push(<rect key={`${r}${c}`} x={19 + c * 17} y={19 + r * 17} width="14" height="14" rx="4.5" fill={LIT[`${r},${c}`] ?? "#2a3042"} />);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs><linearGradient id="lm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#232a3d" /><stop offset="1" stopColor="#0c0e13" /></linearGradient></defs>
      <rect x="2" y="2" width="96" height="96" rx="24" fill="url(#lm-bg)" stroke="#333a4e" strokeWidth="1.5" />
      {cells}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand">
      <LogoMark size={40} />
      <span className="brand-text"><b>SP-404</b><span className="brand-pill">LEARN</span></span>
    </span>
  );
}
