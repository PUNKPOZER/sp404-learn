import { lang, setLang, t } from "./lib/i18n";
import { useEffect } from "react";
import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { Transport } from "./components/Transport";
import { isTauri } from "./lib/sidecar";
import { isAudioPath, openExternalProject, openTrack, pickProject, pickTrack, projectKind, saveProject } from "./state/actions";
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
import { SearchScreen } from "./screens/SearchScreen";
import { SpProject } from "./screens/SpProject";
import { SearchBox } from "./components/SearchBox";
import { Onboarding } from "./components/Onboarding";
import { Structure } from "./screens/Structure";
import { Track } from "./screens/Track";
import { Tutorial } from "./screens/Tutorial";
import { Practice } from "./screens/Practice";
import { LearnThisTrack } from "./screens/LearnThisTrack";
import { stopPlay } from "./lib/audio/preview";
import { stopStems } from "./lib/audio/stemPlayer";
import { Tour } from "./components/Tour";
import { seenTours, tourForScreen } from "./lib/tours";

const SCREENS = { home: HomeLearn, courses: Courses, fxlab: FxLab, fx: FxDetail, tricks: Tricks, trick: TrickDetail, reference: Reference,
  tracklab: TrackLabHome, analyzing: Analyzing, track: Track, stems: Stems, drums: Drums, bass: Bass, structure: Structure, recipe: Recipe,
  tutorial: Tutorial, practice: Practice, learn: LearnThisTrack, search: SearchScreen, spproject: SpProject, settings: Settings };

export function App() {
  const { screen, error, notice, analysis, dirty, projectPath, busy } = useStore((s) => s);
  const Screen = SCREENS[screen];

  useEffect(() => { stopPlay(); stopStems(); }, [screen]);

  // first visit to a screen → a short spotlight tour (once; replay with the "? Подсказки" button)
  useEffect(() => {
    const id = tourForScreen(screen);
    if (!id || seenTours().includes(id) || (["track", "stems", "drums", "bass", "structure", "recipe"].includes(id) && !analysis)) return;
    const t = window.setTimeout(() => { if (!getState().tour && !getState().onboarding && !seenTours().includes(id)) setState({ tour: { id, i: 0 } }); }, 700);
    return () => window.clearTimeout(t);
  }, [screen, analysis]);
  const inspector = screen === "drums" && !!analysis;
  const tutorialMode = useStore((s) => s.tutorial?.mode);
  const showTransport = ["track", "stems", "drums", "bass", "recipe"].includes(screen) || (screen === "tutorial" && (tutorialMode === "course" || tutorialMode === "track"));

  // OS "open this project" requests (Finder double-click, `open -a`, DROP's "Open in LEARN"): listen first, then ask for anything queued during startup
  useEffect(() => {
    if (!isTauri) return;
    let un: (() => void) | undefined, dead = false;
    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const { invoke } = await import("@tauri-apps/api/core");
      un = await listen<string>("open-path", (e) => { void openExternalProject(e.payload); });
      if (dead) { un(); return; }
      const queued = await invoke<string[]>("app_ready");
      if (queued.length) await openExternalProject(queued[queued.length - 1]);
    })();
    return () => { dead = true; un?.(); };
  }, []);

  useEffect(() => {
    if (isTauri) {
      let un: (() => void) | undefined;
      void import("@tauri-apps/api/webview").then(async ({ getCurrentWebview }) => {
        un = await getCurrentWebview().onDragDropEvent((e) => {
          if (e.payload.type !== "drop") return;
          const p = e.payload.paths.find(isAudioPath);
          const proj = e.payload.paths.find((x) => !!projectKind(x));
          if (p) void openTrack(p); else if (proj) void openExternalProject(proj);
          else setState({ error: t("Неподдерживаемый файл. Перетащи WAV, AIFF, MP3, FLAC или M4A.", "Unsupported file. Drop WAV, AIFF, MP3, FLAC or M4A.") });
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
      <div className="appbar"><span>SP SYSTEM / LEARN</span><span className="appbar-right">FOR SP-404MKII
          <span className="langsw" role="group" aria-label="Language">{(["ru", "en"] as const).map((l) => <button key={l} className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => lang !== l && setLang(l)}>{l.toUpperCase()}</button>)}</span></span></div>
      <Sidebar />
      <Onboarding />
      <main className="main">
        <div className="topbar">
          <button className="btn sm" onClick={pickTrack}>{t("Открыть трек", "Open track")}</button>
          <button className="btn sm" onClick={() => void pickProject()}>{t("Открыть проект", "Open project")}</button>
          <button className="btn sm" disabled={!analysis} onClick={() => saveProject(false)}>{t("Сохранить", "Save")}{dirty ? " ●" : ""}</button>
          <button className="btn sm" disabled={!analysis} onClick={() => saveProject(true)}>{t("Сохранить как", "Save as")}</button>
          <span className="mono dim">{projectPath ?? ""}</span>
          <div className="grow" />
          <SearchBox />
          <button className="btn sm" title={t("Показать подсказки по этому экрану", "Show tips for this screen")} onClick={() => { const id = tourForScreen(screen) ?? "welcome"; setState({ tour: { id, i: 0 } }); }}>{t("? Подсказки", "? Tips")}</button>
          {busy === "regrid" && <span className="mono dim">{t("пересчёт сетки…", "recomputing grid…")}</span>}
          {!isTauri && <span className="chip">{t("режим разработки в браузере", "browser dev mode")}</span>}
        </div>
        <div className="content">
        {notice && <div className="notice" role="status">{notice}<button className="link" onClick={() => setState({ notice: null })}>{t("закрыть", "close")}</button></div>}
        {error && screen !== "analyzing" && <div className="err" role="alert">{error}<button className="link" onClick={() => setState({ error: null })}>{t("закрыть", "close")}</button></div>}
          <Screen />
        </div>
        {showTransport ? <Transport /> : <div />}
      </main>
      {inspector && <Inspector />}
      <Tour />
    </div>
  );
}
