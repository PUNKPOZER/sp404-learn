import { useSyncExternalStore } from "react";
import type { Course, CourseMeta, Recipe, StageInfo, StepMap, TrackAnalysis, TutorialStep } from "../lib/types";
import { DEFAULT_KIT } from "../lib/voices";
import { loadDone, loadProgress, type CourseProgress } from "../lib/progress";

export type Screen = "home" | "courses" | "fxlab" | "fx" | "tricks" | "trick" | "reference" | "tracklab" | "analyzing" | "track" | "stems" | "drums" | "bass" | "structure" | "recipe" | "tutorial" | "practice" | "learn" | "settings";

/** Screens that belong to TRACK LAB (the full analysis workflow). */
export const TRACK_LAB_SCREENS: Screen[] = ["tracklab", "analyzing", "track", "stems", "drums", "bass", "structure", "recipe", "learn"];

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
  tutorial: { mode: "track" | "course" | "fx" | "trick" | "lesson"; steps: TutorialStep[]; index: number; title: string; courseId?: string; lessonId?: string; back?: Screen } | null;
  progress: Record<string, CourseProgress>;
  lessonsDone: Record<string, number>;
  practiceId: string | null;
  fxId: string | null;
  trickId: string | null;
  course: Course | null;
  courseList: CourseMeta[];
  projectPath: string | null;
  dirty: boolean;
  playing: boolean;
  playStep: number;
  loop: boolean;
  resumeIndex: number;
  stemMute: Record<string, boolean>;
  stemSolo: string | null;
  stemTime: number;
  stemPlaying: boolean;
  stemLoading: boolean;
  audioTag: string | null;
  tour: { id: string; i: number } | null;
  previewBpm: number | null;
  /** what the transport plays when the user presses PLAY */
  previewSource: "bar" | "pattern" | "tutorial";
}

const initial: AppState = {
  screen: "home", busy: null, error: null, trackPath: null, trackName: null, peaks: [], analysis: null, stages: [],
  recipe: null, kit: { ...DEFAULT_KIT }, patternEdits: {}, minConfidence: 0.3, selectedEventId: null, selectedPad: null,
  currentBar: 0, activePattern: "A", tutorial: null, progress: loadProgress(), lessonsDone: loadDone(), practiceId: null, fxId: null, trickId: null, course: null, courseList: [], projectPath: null, dirty: false,
  playing: false, playStep: -1, loop: true, resumeIndex: 0, stemMute: {}, stemSolo: null, stemTime: 0, stemPlaying: false, stemLoading: false, audioTag: null, tour: null, previewBpm: null, previewSource: "pattern",
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
