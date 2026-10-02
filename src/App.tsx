import { useEffect } from "react";
import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { Transport } from "./components/Transport";
import { isTauri } from "./lib/sidecar";
import { isAudioPath, openProject, openTrack, pickTrack, saveProject } from "./state/actions";
import { setState, useStore } from "./state/store";
import { Analyzing } from "./screens/Analyzing";
import { Bass } from "./screens/Bass";
import { Stems } from "./screens/Stems";
import { Drums } from "./screens/Drums";
import { Home } from "./screens/Home";
import { Learn } from "./screens/Learn";
import { Recipe } from "./screens/Recipe";
import { Settings } from "./screens/Settings";
import { Structure } from "./screens/Structure";
import { Track } from "./screens/Track";
import { Tutorial } from "./screens/Tutorial";
import { stopPlay } from "./lib/audio/preview";
import { stopStems } from "./lib/audio/stemPlayer";

const SCREENS = { home: Home, analyzing: Analyzing, track: Track, stems: Stems, drums: Drums, bass: Bass, structure: Structure, recipe: Recipe,
  learn: Learn, tutorial: Tutorial, settings: Settings };

export function App() {
  const { screen, error, analysis, dirty, projectPath, busy } = useStore((s) => s);
  const Screen = SCREENS[screen];

  useEffect(() => { stopPlay(); stopStems(); }, [screen]);
  const inspector = ["track", "drums", "recipe", "bass", "stems", "structure"].includes(screen) && !!analysis;

  useEffect(() => {
    if (isTauri) {
      let un: (() => void) | undefined;
      void import("@tauri-apps/api/webview").then(async ({ getCurrentWebview }) => {
        un = await getCurrentWebview().onDragDropEvent((e) => {
          if (e.payload.type !== "drop") return;
          const p = e.payload.paths.find(isAudioPath);
          const proj = e.payload.paths.find((x) => x.endsWith(".sp404learn"));
          if (p) void openTrack(p); else if (proj) void openProject(proj);
          else setState({ error: "Unsupported file. Drop WAV, AIFF, MP3, FLAC or M4A." });
        });
      });
      return () => un?.();
    }
    // browser dev mode: upload dropped file to the localhost dev bridge
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
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <button className="btn sm" onClick={pickTrack}>Open track</button>
          <button className="btn sm" onClick={() => openProject()}>Open project</button>
          <button className="btn sm" disabled={!analysis} onClick={() => saveProject(false)}>Save{dirty ? " ●" : ""}</button>
          <button className="btn sm" disabled={!analysis} onClick={() => saveProject(true)}>Save as</button>
          <span className="mono dim">{projectPath ?? ""}</span>
          <div className="grow" />
          {busy === "regrid" && <span className="mono dim">re-quantizing…</span>}
          {!isTauri && <span className="chip">browser dev mode</span>}
        </div>
        <div className="content">
        {error && screen !== "analyzing" && <div className="err" role="alert">{error}<button className="link" onClick={() => setState({ error: null })}>dismiss</button></div>}
          <Screen />
        </div>
        {!["home", "analyzing", "learn", "settings"].includes(screen) ? <Transport /> : <div />}
      </main>
      {inspector && <Inspector />}
    </div>
  );
}
