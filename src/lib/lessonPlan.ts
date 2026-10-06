/** "Learn this track": a learning plan built from the analysis + SP recipe + the Learning Library.
 *  It answers "how could I build something LIKE this on my SP-404?" — not "copy this recording". Instructions are only as firm as the
 *  evidence: low-confidence parts say "check by ear" instead of giving orders. */
import { byId, itemsOf, loc } from "../content/load";
import type { Course, Lesson } from "../content/schema";
import { bassSummary, effectiveGenre, levelOf, tempoReading, type Level } from "./explain";
import { genreName } from "./genres";
import { sectionName } from "./sections";
import { t } from "./i18n";
import type { Recipe, TrackAnalysis } from "./types";

export type ItemType = "lesson" | "trick" | "fx" | "exercise" | "track";
export interface PlanItem { type: ItemType; id: string; title: string }
export interface PlanStep { n: number; id: string; title: string; why: string; level: Level; caution?: string; fromTrack?: string; items: PlanItem[] }
export interface Need { id: string; text: string; level: Level }
export interface LessonPlan {
  genre: string | null; genreLabel: string; genreStatus: "confident" | "hybrid" | "unknown" | "none"; genreSource: "user" | "model" | "none"; options: { genre: string; confidence: number }[];
  bpm: number; tempoLevel: Level; altBpm?: number; needs: Need[]; steps: PlanStep[]; notes: string[];
}

const SLOT_BY_STEP: Record<string, string[]> = { rhythm: ["drums"], groove: ["groove"], bass: ["bass"], chops: ["chops"], variation: ["variation"], fx: ["fx"], perform: ["arrangement", "performance"] };
const GENERIC: Record<string, string[]> = {
  rhythm: ["zero-11-tr-rec", "zero-19-build-your-first-beat"], groove: ["zero-14-swing", "inter-06-swing-and-groove"], break: ["inter-11-break-chopping", "zero-08-chopping"],
  bass: ["inter-08-bass-creation", "inter-09-pitched-bass"], chops: ["zero-08-chopping", "inter-01-advanced-chopping"], vocals: ["inter-10-vocal-chops"],
  variation: ["zero-20-make-a-variation", "inter-03-pattern-variations"], fx: ["zero-16-bus-fx", "zero-17-mfx"], perform: ["zero-22-perform-the-track", "inter-14-chaining-and-arrangement", "inter-12-transitions"],
};
const FX_BY_GENRE: Record<string, string[]> = {
  drum_and_bass: ["filter-drive", "reverb", "back-spin"], jungle: ["back-spin", "reverb", "tape-echo"], uk_garage: ["reverb", "tape-echo"], house: ["filter-drive", "reverb"], techno: ["phaser", "sync-delay", "filter-drive"],
  hip_hop: ["404-vinyl-sim", "cassette-sim", "lo-fi"], footwork: ["djfx-looper", "scatter"], breakbeat: ["overdrive", "crusher"], ambient: ["cloud-delay", "tape-echo", "reverb"],
};
const BREAK_FAMILY = ["jungle", "drum_and_bass", "breakbeat", "footwork"];

const lessonItem = (id: string): PlanItem | null => { const l = byId(id); return l && l.type === "lesson" ? { type: "lesson", id, title: loc(l.title) } : null; };
function genreLessons(genre: string | null, slots: string[]): PlanItem[] {
  if (!genre) return [];
  return itemsOf<Lesson>("lesson").filter((l) => l.tags.includes(`genre:${genre}`) && slots.some((s) => l.tags.includes(`slot:${s}`))).sort((a, b) => a.id.localeCompare(b.id))
    .map((l) => ({ type: "lesson" as const, id: l.id, title: loc(l.title) }));
}
const uniq = (xs: PlanItem[]) => { const seen = new Set<string>(); return xs.filter((x) => (seen.has(`${x.type}:${x.id}`) ? false : (seen.add(`${x.type}:${x.id}`), true))); };

export function buildLessonPlan(a: TrackAnalysis, recipe: Recipe | null, minConfidence = 0.3): LessonPlan {
  const eg = effectiveGenre(a);
  const genre = eg.id;
  const tempo = tempoReading(a.grid.bpm, genre);
  const events = a.events.filter((e) => e.confidence >= minConfidence);
  const drumConf = events.length ? [...events.map((e) => e.confidence)].sort((x, y) => x - y)[Math.floor(events.length / 2)] : 0;
  const bass = bassSummary(a.bass, minConfidence);
  const vocals = a.characteristics.vocal_activity;
  const hasVocals = typeof vocals === "number" && vocals >= 0.15;
  const patterns = recipe?.patterns ?? [];
  const drumVoices = [...new Set(patterns.flatMap((p) => Object.keys(p.steps).filter((v) => ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"].includes(v) && (p.steps[v as keyof typeof p.steps] ?? []).length)))];
  const isBreak = !!genre && BREAK_FAMILY.includes(genre);
  const trackItem: PlanItem = { type: "track", id: "recipe", title: t("Пошагово на паттернах этого трека", "Step by step on this track's patterns") };

  const needs: Need[] = [];
  if (drumVoices.length) needs.push({ id: "drums", level: levelOf(drumConf), text: `${drumVoices.length} ${t("ударных звуков", "drum sounds")}` });
  if (bass.count > 0) needs.push({ id: "bass", level: levelOf(bass.confidence), text: `1 ${t("басовый звук", "bass sound")}` });
  if (hasVocals) needs.push({ id: "vocals", level: "medium", text: t("1–2 вокальных куска для чопов", "1–2 vocal pieces to chop") });
  if (patterns.length > 1) needs.push({ id: "patterns", level: "medium", text: `${patterns.length} ${t("паттерна (A–D)", "patterns (A–D)")}` });

  const lowRhythm = levelOf(drumConf) === "low";
  const pa = patterns[0];
  const pa_text = pa ? Object.entries(pa.steps).filter(([, st]) => (st as number[]).length).slice(0, 4).map(([v, st]) => `${v} ${(st as number[]).join("·")}`).join(" · ") : "";
  const generic = (k: string) => (GENERIC[k] ?? []).map(lessonItem).filter((x): x is PlanItem => !!x);
  const fx = (FX_BY_GENRE[genre ?? ""] ?? ["filter-drive", "reverb"]).map((id) => { const f = byId(id); return f ? ({ type: "fx", id, title: loc(f.title) } as PlanItem) : null; }).filter((x): x is PlanItem => !!x);
  const exercise = genre ? itemsOf("exercise").filter((e) => e.tags.includes(`genre:${genre}`)).map((e) => ({ type: "exercise" as const, id: e.id, title: loc(e.title) })) : [];

  const steps: PlanStep[] = [
    { n: 1, id: "rhythm", title: t("Собери ритм", "Build the rhythm"), level: levelOf(drumConf || 0.4),
      why: t("Ритм — основа: сначала бочка и снейр, потом хэты.", "The rhythm is the foundation: kick and snare first, then hats."),
      caution: lowRhythm ? t("Рисунок ударных найден приблизительно — сверяй на слух.", "The drum pattern is approximate — check it by ear.") : undefined,
      fromTrack: pa && (pa.steps.KICK?.length || pa.steps.SNARE?.length) ? `${t("Паттерн A", "Pattern A")}: ${pa_text}` : undefined, items: uniq([trackItem, ...genreLessons(genre, SLOT_BY_STEP.rhythm), ...exercise, ...generic("rhythm")]) },
    { n: 2, id: "groove", title: isBreak ? t("Сделай вариацию брейка", "Create the break variation") : t("Найди грув", "Shape the groove"), level: genre ? "medium" : "low",
      why: isBreak ? t("В этом стиле живость даёт перестановка кусков брейка и ghost-ноты.", "In this style the life comes from reordering break pieces and ghost notes.") : t("Свинг и динамика отличают живой ритм от механического.", "Swing and dynamics separate a live rhythm from a mechanical one."),
      caution: genre ? undefined : t("Жанр неясен — советы общие.", "The style is unclear — the advice is general."),
      items: uniq([...genreLessons(genre, SLOT_BY_STEP.groove), ...(isBreak ? generic("break") : []), ...generic("groove")]) },
    { n: 3, id: "bass", title: t("Добавь бас", "Add bass"), level: bass.count ? levelOf(bass.confidence) : "low",
      why: t("Бас связывает бочку с гармонией.", "The bass ties the kick to the harmony."),
      caution: !bass.count ? t("Бас в треке не найден — сделай свой по жанру.", "No bass was found — build your own to suit the style.") : levelOf(bass.confidence) === "low" ? t("Ноты баса неуверенные — сверяй на слух.", "The bass notes are uncertain — check them by ear.") : undefined,
      fromTrack: bass.count ? `${t("Чаще всего ноты", "Most common notes")}: ${bass.top.map((x) => x.name).join(", ")}` : undefined, items: uniq([...genreLessons(genre, SLOT_BY_STEP.bass), ...generic("bass")]) },
    { n: 4, id: "chops", title: t("Добавь музыкальный материал", "Add musical material"), level: hasVocals ? "medium" : "low",
      why: t("Хук или чоп — «лицо» трека.", "A hook or chop is the track's face."),
      fromTrack: typeof vocals === "number" ? `${t("Вокал в", "Vocals in")} ${Math.round(vocals * 100)}% ${t("тактов", "of bars")}` : undefined,
      items: uniq([...genreLessons(genre, SLOT_BY_STEP.chops), ...generic("chops"), ...(hasVocals ? generic("vocals") : [])]) },
    { n: 5, id: "variation", title: t("Сделай вариацию", "Create a variation"), level: "medium", why: t("Меняй по одному элементу — тогда слышно развитие.", "Change one element at a time so the development is audible."),
      items: uniq([...genreLessons(genre, SLOT_BY_STEP.variation), ...generic("variation")]) },
    { n: 6, id: "fx", title: t("Добавь эффекты", "Add FX"), level: genre ? "medium" : "low", why: t("Эффекты дают пространство и переходы.", "Effects give space and transitions."),
      items: uniq([...genreLessons(genre, SLOT_BY_STEP.fx), ...fx, ...generic("fx")]) },
    { n: 7, id: "perform", title: t("Исполни аранжировку", "Perform the arrangement"), level: a.sections.length ? "medium" : "low", why: t("Соедини части в трек и сыграй его целиком.", "Join the parts into a track and play it through."),
      fromTrack: a.sections.length ? a.sections.slice(0, 6).map((s) => `${sectionName(s.label)} ${t("такты", "bars")} ${s.start_bar + 1}–${s.end_bar}`).join(" → ") + (a.sections.length > 6 ? ` … (+${a.sections.length - 6})` : "") : undefined,
      items: uniq([...genreLessons(genre, SLOT_BY_STEP.perform), ...generic("perform")]) },
  ];

  const notes: string[] = [];
  if (tempo.level === "low" && tempo.alt) notes.push(t(`Проверь темп: для ${genreName(genre)} типичнее ${tempo.alt} BPM.`, `Check the tempo: ${tempo.alt} BPM is more typical for ${genreName(genre)}.`));
  if (eg.status === "hybrid" || eg.status === "unknown") notes.push(t("Жанр неясен — выбери его сам, чтобы получить советы точнее.", "The style is unclear — pick it yourself for more specific advice."));
  if (eg.status === "none" && !a.genre_user) notes.push(t("Установи Genre Pack (Настройки) для определения жанра.", "Install the Genre Pack (Settings) to detect the style."));
  return { genre, genreLabel: genre ? genreName(genre) : t("Жанр неясен", "Style unclear"), genreStatus: eg.status, genreSource: eg.source, options: eg.options, bpm: a.grid.bpm,
    tempoLevel: tempo.level, altBpm: tempo.alt, needs, steps, notes };
}
export const courseFor = (genre: string | null): Course | undefined => (genre ? itemsOf<Course>("course").find((c) => c.genre === genre) : undefined);
