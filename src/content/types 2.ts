/** Content model for FX LAB, TRICKS and REFERENCE.
 *  RULE: nothing is shown to users unless `status === "verified"`. Verified means the wording was checked against Roland's
 *  official SP-404MK2 documentation (see `sources`). `todo` items are planning placeholders and are never rendered as lessons. */
export type Status = "verified" | "todo";

export interface Source {
  title: string;
  url: string;
  /** ISO date the page was checked */
  verifiedOn: string;
  /** e.g. "SP-404MK2 Reference Manual (v4)"; articles about older models are flagged */
  note?: string;
}

export interface Step {
  text: string;
  /** hardware controls named in the step, as printed on the unit, e.g. "PATTERN SELECT" */
  controls?: string[];
  pads?: number[];
}

export interface FxParam { id: string; label: string; range?: string; meaning: string }

export interface FxEntry {
  id: string;
  /** Learning Library 2.0 metadata (optional for legacy data) */
  category?: string; difficulty?: "beginner" | "intermediate" | "advanced"; durationMin?: number; kind?: "bus" | "input"; related?: string[]; tricks?: string[];
  name: string;
  /** effect button on the unit, when the manual assigns one */
  button?: string;
  status: Status;
  whatItDoes: string;
  params: FxParam[];
  tryThis: Step[];
  useFor: string[];
  tip?: string;
  practice?: string;
  sources: Source[];
}

export interface Trick {
  id: string;
  /** Learning Library 2.0 metadata (optional for legacy data) */
  group?: string; difficulty?: "beginner" | "intermediate" | "advanced"; durationMin?: number;
  title: string;
  topic: string;
  status: Status;
  summary: string;
  steps: Step[];
  notes?: string[];
  sources: Source[];
}

export type RefCategory = "controls" | "concepts" | "shortcuts" | "effects" | "workflow";
export interface RefEntry {
  id: string;
  term: string;
  category: RefCategory;
  status: Status;
  answer: string;
  /** link to an FX LAB / TRICKS item */
  see?: { area: "fx" | "trick"; id: string };
  sources: Source[];
}

export const verified = <T extends { status: Status }>(items: readonly T[]): T[] => items.filter((i) => i.status === "verified");
