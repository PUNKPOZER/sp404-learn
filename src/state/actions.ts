import { api, isTauri } from "../lib/sidecar";
import type { DrumEvent, DrumType, StepMap, TrackAnalysis, TutorialStep } from "../lib/types";
import { resetProgress, saveProgress } from "../lib/progress";
import { stepsFromContent } from "../content/toSteps";
import type { Step } from "../content/types";
import { getState, setState, type Screen } from "./store";

// ---- file helpers (desktop: Tauri dialog + Rust fs; browser dev: not supported) -------------
async function invoke<T>(cmd: string, args: object): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args as Record<string, unknown>);
}
const AUDIO_EXT = ["wav", "aif", "aiff", "mp3", "flac", "m4a"];
export const isAudioPath = (p: string) => AUDIO_EXT.includes(p.split(".").pop()?.toLowerCase() ?? "");

export async function pickTrack() {
  if (!isTauri) { setState({ error: "Открытие трека работает в десктоп-приложении (в режиме браузера — перетащи файл)." }); return; }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const p = await open({ multiple: false, filters: [{ name: "Audio", extensions: AUDIO_EXT }] });
  if (typeof p === "string") await openTrack(p);
}

// ---- analysis ------------------------------------------------------------------------------
export async function openTrack(path: string, useCache = true) {
  if (!isAudioPath(path)) { setState({ error: `Неподдерживаемый тип файла. Подходят: ${AUDIO_EXT.join(", ").toUpperCase()}.` }); return; }
  const name = path.split(/[\\/]/).pop() ?? path;
  setState({ screen: "analyzing", error: null, trackPath: path, trackName: name, stages: [], analysis: null, recipe: null,
    patternEdits: {}, selectedEventId: null, currentBar: 0, projectPath: null, dirty: false, busy: "analyze" });
  try {
    const info = await api.probe(path);
    setState({ peaks: info.peaks });
    const analysis = await api.analyze(path, (s) =>
      setState((st) => ({ stages: [...st.stages.filter((x) => x.id !== s.id), s].sort(order) })), useCache);
    setState({ analysis, busy: null, screen: "track", dirty: true, stages: analysis.stages });
    await refreshRecipe();
  } catch (e) {
    const err = e as Error & { cancelled?: boolean };
    setState({ busy: null, screen: err.cancelled ? "home" : "analyzing", error: err.cancelled ? null : err.message });
  }
}
const STAGE_ORDER = ["prepare", "tempo", "stems", "drums", "bass", "structure", "recipe"];
const order = (a: { id: string }, b: { id: string }) => STAGE_ORDER.indexOf(a.id) - STAGE_ORDER.indexOf(b.id);

export async function cancelAnalysis() { try { await api.cancel(); } catch { /* engine already gone */ } }

// ---- recipe --------------------------------------------------------------------------------
let recipeSeq = 0;
export async function refreshRecipe() {
  const { analysis, kit, patternEdits, minConfidence } = getState();
  if (!analysis) return;
  const seq = ++recipeSeq;
  try {
    const recipe = await api.recipe(analysis, kit, patternEdits, minConfidence);
    if (seq === recipeSeq) setState({ recipe });
  } catch (e) { setState({ error: (e as Error).message }); }
}

// ---- manual corrections --------------------------------------------------------------------
const stepDur = (a: TrackAnalysis) => 60 / a.grid.bpm / (a.resolution / 4);
const slotTime = (a: TrackAnalysis, bar: number, step: number) => a.grid.origin + (bar * a.resolution + step) * stepDur(a);

function edit(fn: (a: TrackAnalysis) => TrackAnalysis) {
  const a = getState().analysis;
  if (!a) return;
  setState({ analysis: fn(a), dirty: true });
  void refreshRecipe();
}
export function addEvent(bar: number, step: number, type: DrumType) {
  edit((a) => {
    const t = slotTime(a, bar, step);
    const ev: DrumEvent = { id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, time: t, type, confidence: 1,
      velocity: 0.8, bar, step, quantized_time: t, timing_offset: 0, manual: true };
    setState({ selectedEventId: ev.id });
    return { ...a, events: [...a.events, ev].sort((x, y) => x.time - y.time) };
  });
}
export function deleteEvent(id: string) {
  edit((a) => ({ ...a, events: a.events.filter((e) => e.id !== id) }));
  if (getState().selectedEventId === id) setState({ selectedEventId: null });
}
export function updateEvent(id: string, patch: Partial<DrumEvent>) {
  edit((a) => ({ ...a, events: a.events.map((e) => (e.id === id ? { ...e, ...patch, manual: true, confidence: patch.type ? 1 : e.confidence } : e)) }));
}
export function moveEvent(id: string, step: number) {
  edit((a) => ({ ...a, events: a.events.map((e) => {
    if (e.id !== id) return e;
    const t = slotTime(a, e.bar, step);
    return { ...e, step, time: t, quantized_time: t, timing_offset: 0, manual: true };
  }) }));
}

export async function setGrid(g: { bpm?: number; origin?: number }, resolution?: number) {
  const a = getState().analysis;
  if (!a) return;
  setState({ busy: "regrid" });
  try {
    const next = await api.regrid(a, g, resolution);
    setState({ analysis: next, dirty: true, busy: null, currentBar: 0 });
    await refreshRecipe();
  } catch (e) { setState({ busy: null, error: (e as Error).message }); }
}
export const halveBpm = () => { const a = getState().analysis; if (a) void setGrid({ bpm: a.grid.bpm / 2 }); };
export const doubleBpm = () => { const a = getState().analysis; if (a) void setGrid({ bpm: a.grid.bpm * 2 }); };
/** Shift which beat counts as step 1 (downbeat) by whole beats. */
export const nudgeDownbeat = (beats: number) => { const a = getState().analysis; if (a) void setGrid({ origin: a.grid.origin + beats * 60 / a.grid.bpm }); };
/** Shift the grid by 16th-note steps (fixes a grid that is right on tempo but starts on the wrong step). */
export const nudgeStep = (steps: number) => { const a = getState().analysis; if (a) void setGrid({ origin: a.grid.origin + steps * 60 / a.grid.bpm / 4 }); };

export function setPatternStep(pattern: string, voice: string, step: number) {
  const { recipe, patternEdits } = getState();
  const base = patternEdits[pattern] ?? recipe?.patterns.find((p) => p.name === pattern)?.steps;
  if (!base) return;
  const next: StepMap = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, [...v]]));
  const cur = next[voice] ?? [];
  next[voice] = cur.includes(step) ? cur.filter((s) => s !== step) : [...cur, step].sort((x, y) => x - y);
  setState({ patternEdits: { ...patternEdits, [pattern]: next }, dirty: true });
  void refreshRecipe();
}
export function resetPattern(pattern: string) {
  const { [pattern]: _drop, ...rest } = getState().patternEdits; void _drop;
  setState({ patternEdits: rest, dirty: true });
  void refreshRecipe();
}
export function setPadVoice(pad: number, voice: string) {
  setState((s) => ({ kit: { ...s.kit, [pad]: voice }, dirty: true }));
  void refreshRecipe();
}

// ---- tutorial ------------------------------------------------------------------------------
export function learnThisTrack() {
  const r = getState().recipe;
  if (!r || !r.tutorialSteps.length) return;
  setState({ tutorial: { mode: "track", steps: r.tutorialSteps, index: Math.min(getState().resumeIndex, r.tutorialSteps.length - 1), title: r.title, back: "recipe" }, screen: "tutorial", previewSource: "tutorial" });
}
export async function loadCourses() {
  if (getState().courseList.length) return;
  try { setState({ courseList: await api.courses() }); } catch (e) { setState({ error: (e as Error).message }); }
}
function recordProgress(courseId: string, steps: TutorialStep[], index: number) {
  const st = steps[index];
  if (!st) return;
  setState({ progress: saveProgress({ courseId, index, total: steps.length, lesson: st.lesson ?? 1, lessons: st.lessonsTotal ?? 1, lessonTitle: st.lessonTitle ?? st.title }) });
}
/** Open a course. `resume` continues from the saved step (Continue learning); otherwise starts at step 1. */
export async function startCourse(name = "footwork", resume = true) {
  try {
    const cached = getState().course;
    const course = cached && cached.name === name ? cached : await api.course(name, getState().kit);
    const saved = resume ? getState().progress[name] : undefined;
    const index = saved && saved.index < course.steps.length ? saved.index : 0;
    setState({ course, tutorial: { mode: "course", courseId: name, steps: course.steps, index, title: course.title, back: "courses" }, screen: "tutorial", previewSource: "tutorial", previewBpm: course.bpm });
    recordProgress(name, course.steps, index);
  } catch (e) { setState({ error: (e as Error).message }); }
}
export function restartCourse(name: string) {
  setState({ progress: resetProgress(name) });
  void startCourse(name, false);
}
/** Run a verified FX LAB "Try this" or TRICKS procedure through the same lesson renderer. */
export function startGuide(mode: "fx" | "trick", title: string, steps: Step[], back: Screen) {
  setState({ tutorial: { mode, steps: stepsFromContent(title, steps), index: 0, title, back }, screen: "tutorial", previewBpm: null });
}
export function tutorialGo(delta: number) {
  const t = getState().tutorial;
  if (!t) return;
  const index = Math.max(0, Math.min(t.steps.length - 1, t.index + delta));
  setState({ tutorial: { ...t, index }, dirty: true });
  if (t.mode === "course" && t.courseId) recordProgress(t.courseId, t.steps, index);
}

// ---- project files -------------------------------------------------------------------------
interface ProjectFile {
  format: "sp404learn"; version: 1; trackPath: string; peaks: number[][]; analysis: TrackAnalysis;
  kit: Record<number, string>; patternEdits: Record<string, StepMap>; minConfidence: number;
  tutorialIndex: number; settings: { currentBar: number; activePattern: string };
}

export async function saveProject(saveAs = false) {
  const s = getState();
  if (!s.analysis || !s.trackPath) return;
  if (!isTauri) { setState({ error: "Сохранение проектов работает в десктоп-приложении." }); return; }
  let path = s.projectPath;
  if (!path || saveAs) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const def = (s.trackName ?? "project").replace(/\.[^.]+$/, "") + ".sp404learn";
    path = await save({ defaultPath: def, filters: [{ name: "SP-404 LEARN project", extensions: ["sp404learn"] }] });
    if (!path) return;
  }
  const file: ProjectFile = { format: "sp404learn", version: 1, trackPath: s.trackPath, peaks: s.peaks, analysis: s.analysis, kit: s.kit,
    patternEdits: s.patternEdits, minConfidence: s.minConfidence, tutorialIndex: s.tutorial?.index ?? 0,
    settings: { currentBar: s.currentBar, activePattern: s.activePattern } };
  try {
    await invoke("write_text_file", { path, contents: JSON.stringify(file) });
    setState({ projectPath: path, dirty: false, error: null });
  } catch (e) { setState({ error: String(e) }); }
}

export async function openProject(path?: string) {
  if (!isTauri) { setState({ error: "Открытие проектов работает в десктоп-приложении." }); return; }
  if (!path) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const p = await open({ multiple: false, filters: [{ name: "SP-404 LEARN project", extensions: ["sp404learn"] }] });
    if (typeof p !== "string") return;
    path = p;
  }
  try {
    const f = JSON.parse(await invoke<string>("read_text_file", { path })) as ProjectFile;
    if (f.format !== "sp404learn") throw new Error("Это не файл проекта SP-404 LEARN.");
    const exists = await invoke<boolean>("path_exists", { path: f.trackPath });
    setState({ trackPath: f.trackPath, trackName: f.trackPath.split(/[\\/]/).pop() ?? f.trackPath, peaks: f.peaks,
      analysis: f.analysis, kit: f.kit, patternEdits: f.patternEdits, minConfidence: f.minConfidence, projectPath: path,
      currentBar: f.settings.currentBar, activePattern: f.settings.activePattern, screen: "track", dirty: false, error: null,
      stages: f.analysis.stages, selectedEventId: null, resumeIndex: f.tutorialIndex, tutorial: null,
    });
    if (!exists) setState({ error: `Исходное аудио не найдено: ${f.trackPath} — анализ загружен из проекта.` });
    await refreshRecipe();
  } catch (e) { setState({ error: String(e instanceof Error ? e.message : e) }); }
}
