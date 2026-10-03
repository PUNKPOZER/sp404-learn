import type { Recipe, TrackAnalysis } from "../lib/types";
import { setState, useStore } from "../state/store";

const COL: Record<string, string> = { A: "#5ef2c0", B: "#5cc8ff", C: "#ffc15e", D: "#ff6fae" };
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Song order: sections laid out proportionally to their length, each tagged with the pattern to play. */
export function ArrangementStrip({ analysis, recipe }: { analysis: TrackAnalysis; recipe: Recipe | null }) {
  const active = useStore((s) => s.activePattern);
  const total = analysis.sections.reduce((m, s) => Math.max(m, s.end), 0) || analysis.duration;
  return (
    <div className="arr">
      <div className="arr-track">
        {analysis.sections.map((s, i) => {
          const pat = recipe?.arrangement[i]?.pattern;
          const c = pat ? COL[pat] : "#8b91a3";
          return (
            <button key={i} className={`arr-seg ${pat === active ? "on" : ""}`} style={{ flexGrow: Math.max(0.08, (s.end - s.start) / total), flexBasis: 0, ["--c" as string]: c }}
              onClick={() => pat && setState({ activePattern: pat })} title={`${s.label} · такты ${s.start_bar + 1}–${s.end_bar}`}>
              <span className="arr-pat">{pat ?? "–"}</span>
              <span className="arr-name">{s.label}</span>
              <span className="arr-time">{fmt(s.start)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
