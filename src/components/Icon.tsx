/** Navigation/UI icon set (24×24, 2px stroke, square caps) — same rules as the SP SYSTEM sprite. */
const P: Record<string, string> = {
  learn: "M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-6M20 5v12h-6",
  courses: "M4 5h6v14H4zM14 5h6v6h-6zM14 15h6v4h-6z",
  fx: "M5 4v16M12 4v16M19 4v16M3 9h4M10 15h4M17 7h4",
  tricks: "M12 3l2.2 6 6 .4-4.7 3.8 1.6 6-5.1-3.4-5.1 3.4 1.6-6L3.8 9.4l6-.4z",
  tracklab: "M2 12h3l2-6 3 12 3-9 2 3h7",
  reference: "M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h3",
  settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  arrow: "M4 12h15M13 6l6 6-6 6",
  play: "M7 4v16l13-8z",
};

export function Icon({ name, size = 20, className = "" }: { name: keyof typeof P | string; size?: number; className?: string }) {
  const fill = name === "play";
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <path d={P[name] ?? ""} />
    </svg>
  );
}
