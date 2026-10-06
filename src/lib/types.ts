export const DRUM_TYPES = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"] as const;
export type DrumType = (typeof DRUM_TYPES)[number] | "UNKNOWN";
export type Voice = string; // drum type or BASS / VOCAL / CHOP / FX ...

export interface DrumEvent {
  id: string; time: number; type: DrumType; confidence: number; velocity: number;
  bar: number; step: number; quantized_time: number; timing_offset: number; manual: boolean;
}
export interface Grid { bpm: number; origin: number; beats_per_bar: number; candidates: number[]; confidence: number }
export interface Section { label: string; start: number; end: number; start_bar: number; end_bar: number; cluster: string; energy: number }
export interface BassNote { time: number; duration: number; midi: number; confidence: number; bar: number; step: number }
export interface StageInfo { id: string; label: string; status: "pending" | "running" | "done" | "warn" | "skipped"; detail: string; seconds: number }
export interface TrackAnalysis {
  schema: number; path: string; filename: string; duration: number; sample_rate: number; channels: number;
  audio_hash: string; grid: Grid; events: DrumEvent[]; sections: Section[]; bass: BassNote[];
  characteristics: Record<string, number>; likely_styles: { style: string; score: number; why: string }[];
  warnings: string[]; stages: StageInfo[]; resolution: number;
  stems: Record<string, StemInfo>; stems_model: string;
  /** Genre Engine 2.0 (only with the Genre Pack) and the user's own correction (never overwrites `genre`) */
  genre?: GenrePrediction | null; genre_user?: string | null;
  /** user corrections kept beside the raw readings: the engine's own BPM is `corrections.bpm.raw`, the user's is `.user` */
  corrections?: { bpm?: { raw: number; user: number } };
}
export interface GenreCandidate { genre: string; confidence: number; family?: string | null }
export interface GenrePrediction {
  available: boolean; error?: string; reason?: string;
  primaryGenre?: string; primaryConfidence?: number; status?: "confident" | "hybrid" | "unknown"; family?: string | null; subgenre?: string | null;
  candidates?: GenreCandidate[]; evidence?: { source: string; text: string }[]; model?: string; sources?: { model: boolean; rhythm: boolean };
}
export interface GenrePackStatus { id: string; runtime: boolean; installed: boolean; filesPresent: boolean; sizeMb: number; license: string; path: string; sources: string[] }
export interface StemInfo { path: string; peaks: number[][]; activity: number[]; duration: number; rms: number }
export interface ModelStatus { runtime: boolean; weights: boolean; name: string; size_mb: number; host: string; path: string; device: string; bytes: number }
export type StepMap = Record<Voice, number[]>; // 1-based steps
export interface Pattern { name: string; bars: number; steps: StepMap; notes?: { BASS?: Record<string, number> }; label?: string; source_bars?: number; edited?: boolean }
export interface Recipe {
  title: string; bpm: number; kit: Record<string, { voice: string; label: string }>;
  patterns: Pattern[]; arrangement: { label: string; start: number; end: number; start_bar: number; end_bar: number; pattern: string }[];
  tutorialSteps: TutorialStep[]; notes: string[];
}
export interface TutorialStep {
  id: number; total: number; section: string; title: string; text: string;
  voice: Voice | null; pad: number | null; highlight: number[]; grid: StepMap;
  lesson?: number; lessonTitle?: string; lessonsTotal?: number;
  /** hardware controls this step is about (printed names, e.g. "PATTERN SELECT") and pads to light on the device diagram */
  controls?: string[]; pads?: number[];
  /** Learning Library 2.0 step extras (all optional) */
  kind?: "hardware" | "concept"; why?: string; tryIt?: string;
  parameter?: { control: string; setting: string; effect: string };
}
export interface CourseMeta { id: string; title: string; bpm: number; short: string; summary: string; lessons: { n: number; title: string; summary: string }[] }
export interface Course {
  name: string; available: boolean; message?: string; bpm: number; title: string;
  steps: TutorialStep[]; lessons: { n: number; title: string; summary: string }[]; patterns: Pattern[];
  kit: Recipe["kit"];
}
