import { startCourse } from "../state/actions";
import { useStore } from "../state/store";

const GENRES = ["FOOTWORK", "JUNGLE", "BREAKBEAT", "HOUSE", "HIP-HOP", "TECHNO"];
const LESSONS = ["Drum kit", "Kick", "Clap", "Snare", "Closed hats", "Open hats", "Percussion", "Syncopation", "Ghost hits", "Substeps",
  "Bass", "Vocal chops", "Pattern variation", "Fill", "Break", "Arrangement", "FX", "Final track"];

export function Learn() {
  const course = useStore((s) => s.course);
  return (
    <div className="screen">
      <header className="screen-head"><h1>Learn</h1></header>
      <div className="genres">{GENRES.map((g) => <button key={g} className={`genre ${g === "FOOTWORK" ? "ready" : ""}`} disabled={g !== "FOOTWORK"} onClick={startCourse}>
        {g}<small>{g === "FOOTWORK" ? "ready" : "soon"}</small></button>)}</div>
      <section className="panel">
        <h2>FOOTWORK · 160 BPM · original educational patterns</h2>
        <ol className="lessons">{LESSONS.map((l, i) => <li key={l}><span className="mono">{String(i + 1).padStart(2, "0")}</span> {course?.lessons[i]?.summary ?? l}</li>)}</ol>
        <button className="btn acid big" onClick={startCourse}>Start course ▸</button>
      </section>
    </div>
  );
}
