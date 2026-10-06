import { CONTROL_GROUPS } from "../components/DeviceDiagram";
import { DIFFICULTIES, MAX_STEP_CHARS, type ContentItem, type Lesson, type LessonStep, type Loc } from "./schema";

export const KNOWN_CONTROLS = new Set<string>([...CONTROL_GROUPS.knobs, ...CONTROL_GROUPS.fx, ...CONTROL_GROUPS.keys, "EXT SOURCE"]);
const ROLAND = /^https:\/\/(static|articles)\.roland\.com\//;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const locs = (item: ContentItem): { path: string; v: unknown }[] => {
  const out: { path: string; v: unknown }[] = [];
  const walk = (v: unknown, path: string) => {
    if (v && typeof v === "object" && !Array.isArray(v) && "ru" in v && "en" in v && Object.keys(v).length === 2) out.push({ path, v });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(item, item.id);
  return out;
};

const stepsOf = (i: ContentItem): LessonStep[] =>
  "steps" in i ? i.steps : "tryThis" in i ? i.tryThis : [];

/** Content rules (LEARN_V2_IMPLEMENTATION_PLAN §2). Returns human-readable problems; empty = valid. */
export function validateItem(item: ContentItem, all: ContentItem[]): string[] {
  const p: string[] = [];
  const id = item.id;
  if (!item.id || !item.type) p.push(`${id}: id/type missing`);
  for (const k of ["title", "summary"] as const) if (!(item[k] as Loc)?.ru || !(item[k] as Loc)?.en) p.push(`${id}: ${k} needs ru and en`);
  if (!DIFFICULTIES.includes(item.difficulty)) p.push(`${id}: difficulty`);
  if (!(item.durationMin > 0)) p.push(`${id}: durationMin`);
  if (!item.category) p.push(`${id}: category`);
  // 1. every Loc has both languages (empty only where the whole item is a placeholder)
  for (const { path, v } of locs(item)) {
    const l = v as Loc;
    if (!l.ru.trim() || !l.en.trim()) p.push(`${path}: both ru and en are required`);
  }
  // 2. verification gate
  const v = item.verification;
  if (!v || !["verified", "needs_review"].includes(v.status)) p.push(`${id}: verification.status`);
  else if (v.status === "verified") {
    if (!v.verifiedAgainst?.length) p.push(`${id}: verified item needs verifiedAgainst`);
    for (const s of v.verifiedAgainst ?? []) if (!ROLAND.test(s.url)) p.push(`${id}: ${s.url} is not a Roland documentation URL`);
    if (!v.verifiedOn || !ISO.test(v.verifiedOn)) p.push(`${id}: verifiedOn (ISO date) required`);
  }
  // 3. controls exist on the device diagram (no invented buttons) + 4. step shape + length
  for (const [i, s] of stepsOf(item).entries()) {
    for (const c of s.deviceHighlight?.controls ?? []) if (!KNOWN_CONTROLS.has(c)) p.push(`${id} step ${i + 1}: unknown control "${c}"`);
    for (const pad of s.deviceHighlight?.pads ?? []) if (!(pad >= 1 && pad <= 16)) p.push(`${id} step ${i + 1}: pad ${pad}`);
    for (const lang of ["ru", "en"] as const) if (s.text[lang].length > MAX_STEP_CHARS) p.push(`${id} step ${i + 1} (${lang}): longer than ${MAX_STEP_CHARS} characters`);
    if (s.kind === "hardware" && v?.status !== "verified") p.push(`${id} step ${i + 1}: hardware step in an item that is not verified`);
    if (s.kind !== "hardware" && s.kind !== "concept") p.push(`${id} step ${i + 1}: kind`);
  }
  if (item.type === "lesson") {
    const l = item as Lesson;
    if (!l.objectives?.length) p.push(`${id}: lesson needs objectives`);
    if (!l.steps?.length) p.push(`${id}: lesson needs steps`);
    if (!l.steps?.some((s) => s.tryIt)) p.push(`${id}: lesson needs a "tryIt" (what / why / how / try it)`);
  }
  // 5. relations resolve
  const ids = new Set(all.map((x) => x.id));
  for (const r of [...(item.prerequisites ?? []), ...(item.related ?? [])]) if (!ids.has(r)) p.push(`${id}: unknown relation "${r}"`);
  if (item.type === "course") for (const l of item.lessons) if (!ids.has(l)) p.push(`${id}: course references unknown lesson "${l}"`);
  if (item.type === "reference" && item.see && !all.some((x) => x.id === item.see!.id && x.type === item.see!.type)) p.push(`${id}: see → ${item.see.id} not found`);
  return p;
}

export function validateAll(items: ContentItem[]): string[] {
  const problems = items.flatMap((i) => validateItem(i, items));
  const seen = new Set<string>();
  for (const i of items) { if (seen.has(i.id)) problems.push(`duplicate id ${i.id}`); seen.add(i.id); }
  // prerequisites must form a DAG
  const byId = new Map(items.map((i) => [i.id, i]));
  const visiting = new Set<string>(), done = new Set<string>();
  const visit = (id: string, trail: string[]) => {
    if (done.has(id)) return;
    if (visiting.has(id)) { problems.push(`prerequisite cycle: ${[...trail, id].join(" → ")}`); return; }
    visiting.add(id);
    for (const r of byId.get(id)?.prerequisites ?? []) visit(r, [...trail, id]);
    visiting.delete(id); done.add(id);
  };
  for (const i of items) visit(i.id, []);
  return problems;
}
