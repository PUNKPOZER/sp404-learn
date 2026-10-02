import { openProject, pickTrack, startCourse } from "../state/actions";
import { setState } from "../state/store";

export function Home() {
  return (
    <div className="home">
      <button className="drop" onClick={pickTrack}>
        <span className="drop-title">Drop a track here</span>
        <span className="drop-sub">or click to open · WAV · AIFF · MP3 · FLAC · M4A</span>
      </button>
      <div className="home-row">
        <section className="panel">
          <h2>Learn without a track</h2>
          <div className="genres">
            <button className="genre ready" onClick={startCourse}>Footwork<small>18 lessons · ready</small></button>
            {["JUNGLE", "BREAKBEAT", "HOUSE", "HIP-HOP", "TECHNO"].map((g) => <button key={g} className="genre" disabled>{g}<small>soon</small></button>)}
          </div>
          <button className="btn" onClick={() => setState({ screen: "learn" })}>Course overview</button>
        </section>
        <section className="panel">
          <h2>Projects</h2>
          <button className="btn" onClick={() => openProject()}>Open project…</button>
          <p className="hint">Projects store analysis, your corrections, pad mapping and tutorial position — not the audio.</p>
        </section>
        <section className="panel privacy">
          <h2>● Local processing</h2>
          <p>Your audio stays on this computer. No account, no telemetry, no network calls.</p>
        </section>
      </div>
    </div>
  );
}
