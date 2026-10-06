import { lang } from "../lib/i18n";
import type { ContentItem, FxEntryV2, LessonStep, Loc, Planned, ReferenceV2, SourceRef, Trick as TrickV2, Verification } from "./schema";
import type { FxEntry, RefEntry, Source, Status, Step, Trick } from "./types";

/** All JSON under /content, bundled by Vite. Files whose name starts with "_" (and planned.json) are not items. */
const files = import.meta.glob("../../content/**/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export const loc = (l: Loc | undefined): string => (l ? l[lang] || l.ru : "");

const isItem = (p: string) => !p.split("/").pop()!.startsWith("_") && !p.endsWith("planned.json");
export const ITEMS: ContentItem[] = Object.entries(files).filter(([p]) => isItem(p)).map(([, v]) => v as ContentItem).sort((a, b) => a.id.localeCompare(b.id));
export const PLANNED: Planned = (Object.entries(files).find(([p]) => p.endsWith("planned.json"))?.[1] as Planned | undefined) ?? { tricks: [], fx: [] };

export const itemsOf = <T extends ContentItem>(type: T["type"]): T[] => ITEMS.filter((i) => i.type === type) as T[];
export const byId = (id: string): ContentItem | undefined => ITEMS.find((i) => i.id === id);

/** Hardware instructions are shown only when verified; `needs_review` items stay out of the production UI. */
export const isPublishable = (v: Verification) => v.status === "verified";

// ---- adapters to the shapes the existing screens already use (so FX LAB / TRICKS / REFERENCE render unchanged) ----
const source = (s: SourceRef, v: Verification): Source => ({ title: s.title, url: s.url, verifiedOn: v.verifiedOn ?? "", note: s.note });
const statusOf = (v: Verification): Status => (v.status === "verified" ? "verified" : "todo");
const step = (s: LessonStep): Step => ({ text: loc(s.text), controls: s.deviceHighlight?.controls, pads: s.deviceHighlight?.pads });

export function fxEntries(): FxEntry[] {
  return itemsOf<FxEntryV2>("fx").filter((f) => isPublishable(f.verification)).map((f) => ({
    id: f.id, name: loc(f.title), button: f.button, status: statusOf(f.verification), whatItDoes: loc(f.whatItDoes),
    params: f.controls.map((c) => ({ id: c.id, label: c.label, range: c.range ? loc(c.range) : undefined, meaning: loc(c.meaning) })),
    tryThis: f.tryThis.map(step), useFor: f.goodFor.map(loc), tip: f.tips[0] ? loc(f.tips[0]) : undefined, practice: f.practice ? loc(f.practice) : undefined,
    sources: (f.verification.verifiedAgainst ?? []).map((s) => source(s, f.verification)),
  }));
}

export function trickEntries(): Trick[] {
  return itemsOf<TrickV2>("trick").filter((x) => isPublishable(x.verification)).map((x) => ({
    id: x.id, title: loc(x.title), topic: x.topic, status: statusOf(x.verification), summary: loc(x.summary), steps: x.steps.map(step),
    group: x.categoryGroup, difficulty: x.difficulty, durationMin: x.durationMin,
    notes: x.notes?.map(loc), sources: (x.verification.verifiedAgainst ?? []).map((s) => source(s, x.verification)),
  }));
}

export function referenceEntries(): RefEntry[] {
  return itemsOf<ReferenceV2>("reference").filter((r) => isPublishable(r.verification)).map((r) => ({
    id: r.id, term: loc(r.term), category: r.refCategory, status: statusOf(r.verification), answer: loc(r.answer),
    see: r.see ? { area: r.see.type, id: r.see.id } : undefined, sources: (r.verification.verifiedAgainst ?? []).map((s) => source(s, r.verification)),
  }));
}
