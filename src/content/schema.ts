/** Learning Library 2.0 — content data model (see LEARN_V2_IMPLEMENTATION_PLAN.md §2).
 *  Content is DATA (JSON under /content), bilingual by construction, rendered by the one shared lesson renderer.
 *  Hardware claims need `verification`; general music advice is marked `concept`. */
export type Loc = { ru: string; en: string };
export type Difficulty = "beginner" | "intermediate" | "advanced";
export const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];
export type VerificationStatus = "verified" | "needs_review";
export type ContentType = "course" | "lesson" | "trick" | "reference" | "exercise" | "recipe" | "fx";

export interface SourceRef { title: string; url: string; section?: string; note?: string }
export interface Verification {
  status: VerificationStatus;
  /** what the hardware operations were checked against (Roland static.roland.com / articles.roland.com only) */
  verifiedAgainst?: SourceRef[];
  firmwareVersion?: string;
  verifiedOn?: string;               // ISO date
}

export interface DeviceHighlight { controls?: string[]; pads?: number[] }
export interface LessonStep {
  text: Loc;                         // short: readable while standing at the SP
  /** "hardware" steps are SP-404 operations (verification required); "concept" is general music-production advice */
  kind: "hardware" | "concept";
  deviceHighlight?: DeviceHighlight;
  padGrid?: { kit?: Record<number, string>; labels?: Record<number, string> };
  stepPattern?: { bpm?: number; voices: Record<string, number[]> };            // 1-based steps, 16-step bar
  audioExample?: { id: string; note?: Loc };
  parameterExample?: { control: string; setting: string; effect: Loc };
  why?: Loc;
  tryIt?: Loc;
}

export interface ContentBase {
  id: string; type: ContentType;
  title: Loc; summary: Loc; description?: Loc;
  category: string; tags: string[];
  difficulty: Difficulty; durationMin: number;
  prerequisites?: string[]; related?: string[];
  verification: Verification;
}

export interface Lesson extends ContentBase { type: "lesson"; objectives: Loc[]; steps: LessonStep[]; tips?: Loc[]; exercise?: string }
export interface Course extends ContentBase { type: "course"; lessons: string[]; finalProject?: Loc; genre?: string; bpm?: number }
export type TrickGroup = "chopping" | "rhythm" | "resampling" | "bass" | "fx" | "workflow" | "performance" | "external";
export interface Trick extends ContentBase { type: "trick"; categoryGroup: TrickGroup; steps: LessonStep[]; notes?: Loc[]; topic: string }
export interface FxParamV2 { id: string; label: string; range?: Loc; meaning: Loc }
export interface FxEntryV2 extends ContentBase {
  type: "fx"; button?: string; whatItDoes: Loc; controls: FxParamV2[]; goodFor: Loc[]; tips: Loc[]; practice?: Loc;
  relatedEffects: string[]; tricks?: string[]; lesson?: string; exercise?: string; tryThis: LessonStep[];
}
export interface ReferenceV2 extends ContentBase { type: "reference"; term: Loc; answer: Loc; refCategory: "controls" | "concepts" | "shortcuts" | "effects" | "workflow"; see?: { type: "fx" | "trick"; id: string } }
export interface PracticeSpec { voices: Record<string, number[]>; bpm: number; bars?: number }
export interface Exercise extends ContentBase { type: "exercise"; practice: PracticeSpec; instructions: Loc[] }
export interface RecipeV2 extends ContentBase { type: "recipe"; ingredients: Loc[]; steps: LessonStep[] }

export type ContentItem = Lesson | Course | Trick | FxEntryV2 | ReferenceV2 | Exercise | RecipeV2;
export interface Planned { tricks: string[]; fx: string[] }

export const MAX_STEP_CHARS = 260;
