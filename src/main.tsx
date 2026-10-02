import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

import * as actions from "./state/actions";
if (import.meta.env.DEV) (window as unknown as { sp: typeof actions }).sp = actions;

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// Dev-only end-to-end check of the real Tauri ↔ sidecar path (no UI interaction needed).
if (import.meta.env.DEV && "__TAURI_INTERNALS__" in window) {
  void (async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const path = await invoke<string | null>("autotest_path");
    if (!path) return;
    const { getState } = await import("./state/store");
    await actions.openTrack(path);
    const s = getState();
    await invoke("write_text_file", { path: "/tmp/sp404_autotest.json", contents: JSON.stringify({
      bpm: s.analysis?.grid.bpm, events: s.analysis?.events.length, screen: s.screen, error: s.error,
      patterns: s.recipe?.patterns.length, tutorialSteps: s.recipe?.tutorialSteps.length }) });
    if (s.analysis) { await actions.saveProject(false).catch(() => {}); }
  })();
}
