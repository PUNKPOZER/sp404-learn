import { setState, useStore } from "../state/store";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const COL = ["#c6ff3d", "#3dd6ff", "#ff6a1a", "#ff3d8b"];

export function Structure() {
  const { analysis: a, recipe } = useStore((s) => s);
  if (!a) return null;
  const total = a.duration;
  return (
    <div className="screen">
      <header className="screen-head"><h1>STRUCTURE</h1><span className="hint">Approximate — based on bar-level energy and drum density.</span></header>
      <div className="timeline">
        {a.sections.map((s, i) => (
          <div key={i} className="tl-seg" style={{ flex: s.end - s.start, background: COL["ABCD".indexOf(s.cluster)] + "33", borderColor: COL["ABCD".indexOf(s.cluster)] }}>
            <b>{s.label}</b><small>{fmt(s.start)}</small>
          </div>
        ))}
      </div>
      <table className="kv"><thead><tr><th>SECTION</th><th>TIME</th><th>BARS</th><th>PATTERN</th></tr></thead><tbody>
        {a.sections.map((s, i) => {
          const pat = recipe?.arrangement[i]?.pattern ?? "—";
          return <tr key={i}><td>{s.label}</td><td className="mono">{fmt(s.start)} — {fmt(Math.min(total, s.end))}</td>
            <td className="mono">{s.start_bar + 1}–{s.end_bar}</td>
            <td><button className="link" onClick={() => setState({ activePattern: pat, screen: "recipe" })}>{pat}</button></td></tr>;
        })}
      </tbody></table>
    </div>
  );
}
