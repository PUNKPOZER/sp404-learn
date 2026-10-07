/** Genre-based recommendations from the Learning Library. The genre is a suggestion, never a lock: the same function serves a detected genre,
 *  the user's own choice, or none (then it recommends the beginner path). Completed lessons drop to the bottom. */
import { byId, itemsOf, loc } from "../content/load";
import type { Course } from "../content/schema";
import { genreName } from "./genres";
import { t } from "./i18n";

export interface Rec { type: "lesson" | "trick" | "fx" | "exercise" | "course"; id: string; title: string; reason: string; done: boolean }

/** Curated, in order of usefulness. Ids must exist (validated by tests). */
export const GENRE_PICKS: Record<string, string[]> = {
  uk_garage: ["ukg-01-what", "ukg-02-drums", "ukg-03-groove", "swing-shuffle", "vocal-chops-trick", "ex-uk-garage"],
  footwork: ["fw-01-what", "fw-02-drums", "fw-03-groove", "rolls-trick", "ghost-hits", "ex-footwork"],
  jungle: ["jg-01-what", "jg-02-drums", "jg-05-chops", "break-chop-live", "back-spin", "ex-jungle"],
  drum_and_bass: ["dnb-01-what", "dnb-02-drums", "dnb-04-bass", "build-up", "filter-sweep", "ex-drum-and-bass"],
  breakbeat: ["bb-01-what", "bb-02-drums", "bb-05-chops", "break-chop-live", "humanized-hats", "ex-breakbeat"],
  hip_hop: ["hh-01-what", "hh-02-drums", "hh-03-groove", "swing-shuffle", "lo-fi-texture", "ex-boom-bap"],
  house: ["hs-01-what", "hs-02-drums", "hs-04-bass", "filter-sweep", "ex-house"],
  techno: ["tc-01-what", "tc-02-drums", "tc-04-bass", "filter-sweep", "perform-with-fx", "ex-techno"],
  ambient: ["am-01-what", "am-05-chops", "am-06-fx", "cloud-delay", "live-resampling", "ex-sparse-pulse"],
  idm: ["inter-04-microtiming", "broken-rhythms", "destructive-sound-design", "inter-15-sound-design"],
  dub: ["tape-echo", "reverb-transition", "inter-08-bass-creation", "ex-sparse-pulse"],
  dubstep: ["inter-08-bass-creation", "stopper", "bass-from-sample"],
  trip_hop: ["hh-01-what", "lo-fi-texture", "cassette-sim", "ex-boom-bap"],
};
const BEGINNER = ["zero-01-device-overview", "zero-04-playing-samples", "zero-11-tr-rec", "zero-19-build-your-first-beat", "ex-four-on-the-floor"];

const asRec = (id: string, reason: string, done: Record<string, number>): Rec | null => {
  const it = byId(id);
  if (!it || it.verification.status !== "verified" || !["lesson", "trick", "fx", "exercise", "course"].includes(it.type)) return null;
  return { type: it.type as Rec["type"], id, title: loc(it.title), reason, done: id in done };
};

/** Up to `limit` picks. `fundamentals` (0–100) is how much of "SP-404 from zero" is done — a newcomer gets one beginner lesson first. */
export function recommend(genre: string | null, done: Record<string, number> = {}, opts: { limit?: number; fundamentals?: number } = {}): Rec[] {
  const limit = opts.limit ?? 6;
  const picks: Rec[] = [];
  if ((opts.fundamentals ?? 100) < 50) {
    const next = BEGINNER.find((id) => !(id in done));
    const r = next && asRec(next, t("Основы SP-404 — сначала они", "SP-404 basics come first"), done);
    if (r) picks.push(r);
  }
  const list = genre ? GENRE_PICKS[genre] ?? [] : [];
  const why = genre ? t(`Для ${genreName(genre)}`, `For ${genreName(genre)}`) : t("Для начала", "To get started");
  for (const id of genre ? list : BEGINNER) { const r = asRec(id, why, done); if (r && !picks.some((p) => p.id === r.id)) picks.push(r); }
  // pending first, completed last — but never an empty list
  const pending = picks.filter((p) => !p.done), finished = picks.filter((p) => p.done);
  return [...pending, ...finished].slice(0, limit);
}
export const genreOfCourse = (courseId: string): string | null => itemsOf<Course>("course").find((c) => c.id === courseId)?.genre ?? null;
