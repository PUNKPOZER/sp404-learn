import { useEffect } from "react";
import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { Transport } from "./components/Transport";
import { isTauri } from "./lib/sidecar";
import { isAudioPath, openProject, openTrack, pickTrack, saveProject } from "./state/actions";
import { getState, setState, useStore } from "./state/store";
import { Analyzing } from "./screens/Analyzing";
import { Bass } from "./screens/Bass";
import { Stems } from "./screens/Stems";
import { Drums } from "./screens/Drums";
import { HomeLearn } from "./screens/HomeLearn";
import { Courses } from "./screens/Courses";
import { FxLab } from "./screens/FxLab";
import { FxDetail } from "./screens/FxDetail";
import { Tricks } from "./screens/Tricks";
import { TrickDetail } from "./screens/TrickDetail";
import { Reference } from "./screens/Reference";
import { TrackLabHome } from "./screens/TrackLabHome";
import { Recipe } from "./screens/Recipe";
import { Settings } from "./screens/Settings";
import { Structure } from "./screens/Structure";
import { Track } from "./screens/Track";
import { Tutorial } from "./screens/Tutorial";
import { stopPlay } from "./lib/audio/preview";
import { stopStems } from "./lib/audio/stemPlayer";
import { Tour } from "./components/Tour";
import { seenTours, tourForScreen } from "./lib/tours";

const SCREENS = { home: HomeLearn, courses: Courses, fxlab: FxLab, fx: FxDetail, tricks: Tricks, trick: TrickDetail, reference: Reference,
  tracklab: TrackLabHome, analyzing: Analyzing, track: Track, stems: Stems, drums: Drums, bass: Bass, structure: Structure, recipe: Recipe,
  tutorial: Tutorial, settings: Settings };

export function App() {
  const { screen, error, analysis, dirty, projectPath, busy } = useStore((s) => s);
  const Screen = SCREENS[screen];

  useEffect(() => { stopPlay(); stopStems(); }, [screen]);

  // first visit to a screen → a short spotlight tour (once; replay with the "? Подсказки" button)
  useEffect(() => {
    const id = tourForScreen(screen);
    if (!id || seenTours().includes(id) || (["track", "stems", "drums", "bass", "structure", "recipe"].includes(id) && !analysis)) return;
    const t = window.setTimeout(() => { if (!getState().tour) setState({ tour: { id, i: 0 } }); }, 700);
    return () => window.clearTimeout(t);
  }, [screen, analysis]);
  const inspector = screen === "drums" && !!analysis;
  const tutorialMode = useStore((s) => s.tutorial?.mode);
  const showTransport = ["track", "stems", "drums", "bass", "recipe"].includes(screen) || (screen === "tutorial" && (tutorialMode === "course" || tutorialMode === "track"));

  useEffect(() => {
    if (isTauri) {
      let un: (() => void) | undefined;
      void import("@tauri-apps/api/webview").then(async ({ getCurrentWebview }) => {
        un = await getCurrentWebview().onDragDropEvent((e) => {
          if (e.payload.type !== "drop") return;
          const p = e.payload.paths.find(isAudioPath);
          const proj = e.payload.paths.find((x) => x.endsWith(".sp404learn"));
          if (p) void openTrack(p); else if (proj) void openProject(proj);
          else setState({ error: "Неподдерживаемый файл. Перетащи WAV, AIFF, MP3, FLAC или M4A." });
        });
      });
      return () => un?.();
    }
    // режим разработки в браузере: upload dropped file to the localhost dev bridge
    const over = (e: DragEvent) => e.preventDefault();
    const drop = async (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files[0]; if (!f) return;
      const r = await fetch("http://127.0.0.1:8404/upload", { method: "POST", headers: { "X-Filename": f.name }, body: await f.arrayBuffer() });
      void openTrack((await r.json()).path);
    };
    window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, []);

  return (
    <div className={`app ${inspector ? "" : "no-inspector"}`}>
      <div className="appbar"><span>SP SYSTEM / LEARN</span><span>FOR SP-404MKII</span></div>
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <button className="btn sm" onClick={pickTrack}>Открыть трек</button>
          <button className="btn sm" onClick={() => openProject()}>Открыть проект</button>
          <button className="btn sm" disabled={!analysis} onClick={() => saveProject(false)}>Сохранить{dirty ? " ●" : ""}</button>
          <button className="btn sm" disabled={!analysis} onClick={() => saveProject(true)}>Сохранить как</button>
          <span className="mono dim">{projectPath ?? ""}</span>
          <div className="grow" />
          <button className="btn sm" title="Показать подсказки по этому экрану" onClick={() => { const id = tourForScreen(screen) ?? "welcome"; setState({ tour: { id, i: 0 } }); }}>? Подсказки</button>
          {busy === "regrid" && <span className="mono dim">пересчёт сетки…</span>}
          {!isTauri && <span className="chip">режим разработки в браузере</span>}
        </div>
        <div className="content">
        {error && screen !== "analyzing" && <div className="err" role="alert">{error}<button className="link" onClick={() => setState({ error: null })}>закрыть</button></div>}
          <Screen />
        </div>
        {showTransport ? <Transport /> : <div />}
      </main>
      {inspector && <Inspector />}
      <Tour />
    </div>
  );
}
