import { useStore } from "../state/store";

const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const noteName = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

export function Bass() {
  const a = useStore((s) => s.analysis);
  if (!a) return null;
  return (
    <div className="screen">
      <header className="screen-head"><h1>BASS</h1></header>
      {a.bass.length === 0 ? (
        <section className="panel"><h2>NOT AVAILABLE YET</h2>
          <p>Bass note detection is not implemented in this build, so nothing is shown instead of guessing. The analyzer slot exists
            (<span className="mono">engine/bass</span>); a pitch tracker can be dropped in without changing the UI.</p></section>
      ) : (
        <table className="kv"><thead><tr><th>NOTE</th><th>BAR</th><th>STEP</th><th>CONF</th></tr></thead><tbody>
          {a.bass.map((b, i) => <tr key={i}><td className="mono">{noteName(b.midi)}</td><td>{b.bar + 1}</td><td>{b.step + 1}</td><td>{(b.confidence * 100).toFixed(0)}%</td></tr>)}
        </tbody></table>
      )}
    </div>
  );
}
