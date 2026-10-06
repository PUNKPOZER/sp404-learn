/** Unified, offline library search (courses · lessons · tricks · reference · FX · exercises) in the UI language.
 *  Token AND-search with light stemming (resample ≈ resampling; чоп ≈ чопы), weighted by where the match is (title > tags > summary > steps). */
import { ITEMS, loc } from "../content/load";
import type { ContentItem, ContentType } from "../content/schema";
import { lang } from "./i18n";

export interface SearchDoc { item: ContentItem; title: string; fields: { w: number; tokens: string[] }[] }
export interface SearchResult { type: ContentType; id: string; title: string; summary: string; difficulty: ContentItem["difficulty"]; durationMin: number; score: number }
export const RESULT_ORDER: ContentType[] = ["course", "lesson", "trick", "reference", "fx", "exercise", "recipe"];

export function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[[\]()«»"“”.,:;!?/\\|+–—-]+/g, " ").split(/\s+/).filter((x) => x.length >= 2 || /\d/.test(x));
}
/** Very light stemmer: strips common English and Russian endings so inflections meet ("resampling" ≈ "resample", "нарезки" ≈ "нарезка"). */
export function stem(w: string): string {
  if (w.length < 5) return w;
  let s = w;
  s = s.replace(/(ing|ed|es|s|e)$/, "");
  s = s.replace(/(ами|ями|ов|ев|ей|ой|ий|ый|ая|яя|ое|ее|ую|юю|ом|ем|ах|ях|ы|и|а|я|у|ю|е|о|ь)$/, "");
  return s.length >= 3 ? s : w;
}
const matchKind = (q: string, w: string): number => {
  if (w === q) return 1;
  if (w.startsWith(q)) return 0.85;
  const a = stem(q), b = stem(w);
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return 0.75;
  if (q.length >= 4 && w.includes(q)) return 0.4;
  return 0;
};

function stepsText(i: ContentItem): string {
  const steps = "steps" in i ? i.steps : "tryThis" in i ? i.tryThis : [];
  const controls = steps.flatMap((s) => s.deviceHighlight?.controls ?? []);
  return `${steps.map((s) => loc(s.text)).join(" ")} ${controls.join(" ")}`;
}
function build(items: ContentItem[]): SearchDoc[] {
  return items.map((item) => {
    const extra = item.type === "fx" ? `${item.button ?? ""} ${item.controls.map((c) => c.label).join(" ")}` : item.type === "reference" ? `${loc(item.term)} ${loc(item.answer)}` : "";
    return { item, title: loc(item.title), fields: [
      { w: 6, tokens: tokenize(loc(item.title)) },
      { w: 3.5, tokens: tokenize(`${item.tags.map((t) => t.replace(/^[a-z-]+:/, "").replace(/[_-]/g, " ")).join(" ")} ${item.category}`) },
      { w: 3, tokens: tokenize(loc(item.summary)) },
      { w: 2, tokens: tokenize(extra) },
      { w: 1, tokens: tokenize(stepsText(item)) },
      // the other language's title/summary, weak: people type "vocal chop" or "resample" into a Russian UI
      { w: 1.5, tokens: tokenize(`${item.title[lang === "ru" ? "en" : "ru"]} ${item.summary[lang === "ru" ? "en" : "ru"]}`) },
    ] };
  });
}
let cache: { lang: string; docs: SearchDoc[] } | null = null;
const docs = () => (cache && cache.lang === lang ? cache.docs : (cache = { lang, docs: build(ITEMS.filter((i) => i.verification.status === "verified")) }).docs);

export function search(query: string, opts: { types?: ContentType[]; limit?: number; docs?: SearchDoc[] } = {}): SearchResult[] {
  const qs = tokenize(query);
  if (!qs.length) return [];
  const out: SearchResult[] = [];
  for (const d of opts.docs ?? docs()) {
    if (opts.types && !opts.types.includes(d.item.type)) continue;
    let total = 0, ok = true;
    for (const q of qs) {
      let best = 0;
      for (const f of d.fields) for (const w of f.tokens) { const m = matchKind(q, w); if (m) best = Math.max(best, m * f.w); }
      if (!best) { ok = false; break; }
      total += best;
    }
    if (!ok) continue;
    const phrase = d.title.toLowerCase().includes(query.trim().toLowerCase()) ? 4 : 0;           // whole phrase in the title ranks first
    out.push({ type: d.item.type, id: d.item.id, title: d.title, summary: loc(d.item.summary), difficulty: d.item.difficulty, durationMin: d.item.durationMin, score: total + phrase });
  }
  out.sort((a, b) => b.score - a.score || RESULT_ORDER.indexOf(a.type) - RESULT_ORDER.indexOf(b.type) || a.title.localeCompare(b.title));
  return out.slice(0, opts.limit ?? 60);
}
export function groupResults(rs: SearchResult[]): [ContentType, SearchResult[]][] {
  return RESULT_ORDER.map((t) => [t, rs.filter((r) => r.type === t)] as [ContentType, SearchResult[]]).filter(([, l]) => l.length);
}
export const buildIndex = build;
