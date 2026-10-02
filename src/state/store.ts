import { useSyncExternalStore } from "react";
import type { Course, Recipe, StageInfo, StepMap, TrackAnalysis, TutorialStep } from "../lib/types";
import { DEFAULT_KIT } from "../lib/voices";

export type Screen = "home" | "analyzing" | "track" | "drums" | "bass" | "structure" | "recipe" | "learn" | "tutorial" | "settings";

export interface AppState {
  screen: Screen;
  busy: string | null;
  error: string | null;
  trackPath: string | null;
  trackName: string | null;
  peaks: number[][];
  analysis: TrackAnalysis | null;
  stages: StageInfo[];
  recipe: Recipe | null;
  kit: Record<number, string>;
  patternEdits: Record<string, StepMap>;
  minConfidence: number;
  selectedEventId: string | null;
  selectedPad: number | null;
  currentBar: number;
  activePattern: string;
  tutorial: { mode: "track" | "course"; steps: TutorialStep[]; index: number; title: string } | null;
  course: Course | null;
  projectPath: string | null;
  dirty: boolean;
  playing: boolean;
  playStep: number;
  loop: boolean;
  resumeIndex: number;
  previewBpm: number | null;
  /** what the transport plays when the user presses PLAY */
  previewSource: "bar" | "pattern" | "tutorial";
}

const initial: AppState = {
  screen: "home", busy: null, error: null, trackPath: null, trackName: null, peaks: [], analysis: null, stages: [],
  recipe: null, kit: { ...DEFAULT_KIT }, patternEdits: {}, minConfidence: 0.3, selectedEventId: null, selectedPad: null,
  currentBar: 0, activePattern: "A", tutorial: null, course: null, projectPath: null, dirty: false,
  playing: false, playStep: -1, loop: true, resumeIndex: 0, previewBpm: null, previewSource: "pattern",
};

let state: AppState = initial;
const listeners = new Set<() => void>();

export const getState = () => state;
export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((l) => l());
}
export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => sel(state));
}
export const resetState = () => setState({ ...initial, kit: { ...DEFAULT_KIT } });
