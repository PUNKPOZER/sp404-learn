/** Track Lab explanations: what the analysis found, in words, with an honest confidence level and one thing to try.
 *
 *  Scope is deliberate. Measured on 58 real tracks (GENRE_BASELINE.md): tempo agrees with a DJ-software reference 81 % (97 % allowing
 *  half/double) and the genre model is right ~84 %, but the *drum-pattern descriptors* (syncopation ≈ 0.6–0.77 on almost every track,
 *  four-on-the-floor lower for techno than for hip-hop) do not separate styles yet. So they are NOT turned into advice here — they are
 *  shown as "what the app heard (approximate)" under DETAILS, and the cards that give advice are built on tempo, genre, structure and bass. */
import type { BassNote, Section, TrackAnalysis } from "./types";
import { genreName } from "./genres";
import { noteName } from "./voices";
import { sectionName } from "./sections";
import { t } from "./i18n";

export type Level = "high" | "medium" | "low";
export const levelOf = (c: number): Level => (c >= 0.75 ? "high" : c >= 0.5 ? "medium" : "low");
export interface ExplainCard {
  id: "tempo" | "style" | "structure" | "drums" | "bass" | "vocals";
  level: Level; headline: string; body: string; tryThis?: string;
  learn?: { type: "lesson" | "trick" | "course"; id: string }[];
  details: [string, string][];
  /** a better tempo reading the user can switch to with one click */
  altBpm?: number;
}

// Typical tempo of each style (BPM centre, width in log2 units) — the same soft modes as python/engine/genre/evidence.py.
export const TEMPO_MODES: Record<string, [number, number][]> = {
  footwork: [[160, 0.06]], jungle: [[165, 0.06]], drum_and_bass: [[174, 0.045]], breakbeat: [[125, 0.12]], uk_garage: [[133, 0.05]], house: [[124, 0.05]],
  techno: [[135, 0.09]], hip_hop: [[90, 0.11], [140, 0.04]], ambient: [[100, 0.7]], idm: [[120, 0.5]], dub: [[70, 0.09], [140, 0.05]], dubstep: [[140, 0.04], [70, 0.04]], trip_hop: [[85, 0.12]],
};
export function tempoFit(genre: string, bpm: number): number {
  const modes = TEMPO_MODES[genre];
  if (!modes || bpm <= 0) return 0;
  return Math.max(...modes.map(([c, s]) => Math.exp(-0.5 * ((Math.log2(bpm) - Math.log2(c)) / s) ** 2)));
}
/** Which genre-compatible tempo reading is best: the engine's, or half / double? */
export function tempoReading(bpm: number, genre: string | null): { level: Level; alt?: number; reason?: "fits" | "other-fits" } {
  if (!genre || !TEMPO_MODES[genre] || genre === "ambient") return { level: "medium" };
  const cur = tempoFit(genre, bpm);
  const alts = [bpm / 2, bpm * 2].map((b) => ({ b, f: tempoFit(genre, b) })).sort((x, y) => y.f - x.f)[0];
  if (alts.f >= 0.5 && cur < 0.2) return { level: "low", alt: Math.round(alts.b * 10) / 10, reason: "other-fits" };
  if (cur >= 0.5) return { level: "high", reason: "fits" };
  return { level: "medium" };
}

export interface EffectiveGenre { id: string | null; status: "confident" | "hybrid" | "unknown" | "none"; source: "user" | "model" | "none"; options: { genre: string; confidence: number }[] }
export function effectiveGenre(a: TrackAnalysis): EffectiveGenre {
  const g = a.genre;
  const options = (g?.candidates ?? []).slice(0, 3).map((c) => ({ genre: c.genre, confidence: c.confidence }));
  if (a.genre_user) return { id: a.genre_user, status: "confident", source: "user", options };
  if (!g?.available || !g.primaryGenre) return { id: null, status: "none", source: "none", options };
  if (g.status === "confident") return { id: g.primaryGenre, status: "confident", source: "model", options };
  return { id: null, status: (g.status as "hybrid" | "unknown") ?? "unknown", source: "model", options };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (x: number) => `${Math.round(x * 100)}%`;
export function bassSummary(bass: BassNote[], min = 0.3) {
  const notes = bass.filter((b) => b.confidence >= min);
  const counts = new Map<number, number>();
  for (const n of notes) counts.set(n.midi, (counts.get(n.midi) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, c]) => ({ midi: m, name: noteName(m), count: c }));
  return { count: notes.length, top, lowest: notes.length ? Math.min(...notes.map((n) => n.midi)) : null, confidence: median(notes.map((n) => n.confidence)) };
}
const sectionLine = (s: Section) => `${sectionName(s.label)} ${mmss(s.start)}–${mmss(s.end)} (${t("такты", "bars")} ${s.start_bar + 1}–${s.end_bar})`;

export function explainTrack(a: TrackAnalysis, minConfidence = 0.3): ExplainCard[] {
  const cards: ExplainCard[] = [];
  const eg = effectiveGenre(a);
  // ---- tempo
  const tr = tempoReading(a.grid.bpm, eg.id);
  const half = Math.round((a.grid.bpm / 2) * 10) / 10, dbl = Math.round(a.grid.bpm * 2 * 10) / 10;
  cards.push({
    id: "tempo", level: tr.level, altBpm: tr.alt,
    headline: `${a.grid.bpm.toFixed(a.grid.bpm % 1 ? 1 : 0)} BPM`,
    body: tr.reason === "other-fits"
      ? t(`Для ${genreName(eg.id)} типичнее ${tr.alt} BPM — возможно, прибор поймал половинный или двойной темп. Проверь на слух.`, `${tr.alt} BPM is more typical for ${genreName(eg.id)} — the engine may have locked on half or double time. Check by ear.`)
      : t(`Прибор слышит один пульс. Тот же ритм можно прочесть и как ${half}, и как ${dbl} BPM — выбери тот, под который хочется кивать.`, `The engine hears one pulse. The same rhythm can also be read as ${half} or ${dbl} BPM — pick the one you nod to.`),
    tryThis: t("Простучи темп под трек: [SHIFT] + пэд [11], кнопка [SUB PAD]. Если твой счёт вдвое быстрее или медленнее — нажми ÷2 / ×2.", "Tap the tempo along with the track: [SHIFT] + pad [11], then [SUB PAD]. If your count is twice as fast or slow, press ÷2 / ×2."),
    details: [[t("Определено", "Detected"), `${a.grid.bpm.toFixed(2)} BPM`], [t("Другие прочтения", "Other readings"), a.grid.candidates.map((c) => c.toFixed(1)).join(", ") || "—"]],
  });
  // ---- style
  const g = a.genre;
  if (eg.status === "none" && !a.genre_user) {
    cards.push({ id: "style", level: "low", headline: t("Жанр не определён", "Style unknown"),
      body: t("Надёжное определение жанра работает с необязательным пакетом Genre Pack (Настройки). Без него советы остаются общими.", "Reliable genre detection needs the optional Genre Pack (Settings). Without it the advice stays general."),
      details: a.likely_styles.map((s): [string, string] => [s.style, `${Math.round(s.score * 100)} (${t("грубая подсказка по ритму", "rough rhythm hint")})`]) });
  } else {
    const level: Level = eg.source === "user" ? "high" : eg.status === "confident" ? (levelOf(g?.primaryConfidence ?? 0.7) === "high" ? "high" : "medium") : "low";
    const opts = eg.options.map((o) => `${genreName(o.genre)} ${pct(o.confidence)}`).join(" · ");
    cards.push({
      id: "style", level,
      headline: eg.id ? genreName(eg.id) : eg.status === "hybrid" ? eg.options.slice(0, 2).map((o) => genreName(o.genre)).join(" / ") : t("Жанр неясен", "Style unclear"),
      body: eg.source === "user" ? t("Выбран тобой — советы построены по этому жанру.", "Chosen by you — the advice follows this genre.")
        : eg.status === "confident" ? t("Скорее всего. Это подсказка, а не вердикт: можно сменить жанр.", "Most likely. It's a hint, not a verdict: you can change the genre.")
        : t("Модель не уверена — ниже общие советы. Выбери жанр сам, чтобы получить точнее.", "The model isn't sure — the advice below is general. Pick the genre yourself for something more specific."),
      tryThis: eg.id ? undefined : t("Послушай трек и выбери жанр кнопкой «Сменить жанр».", "Listen to the track and pick a genre with “Change genre”."),
      learn: eg.id ? [{ type: "course", id: `genre-${eg.id.replace(/_/g, "-")}` }] : undefined,
      details: [[t("Кандидаты", "Candidates"), opts || "—"], ...(g?.evidence ?? []).map((e): [string, string] => [e.source, e.text])],
    });
  }
  // ---- structure
  if (a.sections.length) {
    const lens = a.sections.map((s) => s.end_bar - s.start_bar);
    cards.push({ id: "structure", level: "medium", headline: `${a.sections.length} ${t("секций", "sections")}`,
      body: t(`${a.sections.map((s) => sectionName(s.label)).join(" → ")}. Границы приблизительные: секции собраны по громкости и плотности ударных.`, `${a.sections.map((s) => sectionName(s.label)).join(" → ")}. The boundaries are approximate: sections are built from loudness and drum density.`),
      tryThis: t("Открой «Структуру», послушай каждый блок и поправь на слух, где ты слышишь смену.", "Open Structure, listen to each block and judge by ear where you hear the change."),
      details: [...a.sections.map((s): [string, string] => [sectionName(s.label), sectionLine(s)]), [t("Длины, такты", "Lengths, bars"), lens.join(" · ")]] });
  }
  // ---- drums (approximate by design)
  const ev = a.events.filter((e) => e.confidence >= minConfidence);
  if (ev.length) {
    const conf = median(ev.map((e) => e.confidence));
    const n = Math.max(1, a.events.length ? Math.max(...a.events.map((e) => e.bar)) + 1 : 1);
    const per = (ty: string[]) => ev.filter((e) => ty.includes(e.type)).length / n;
    const types = [...new Set(ev.map((e) => e.type))];
    cards.push({ id: "drums", level: levelOf(conf), headline: `${types.length} ${t("ударных звуков", "drum sounds")}`,
      body: levelOf(conf) === "low"
        ? t("Рисунок ударных найден приблизительно — сверяй на слух и правь в «Ударных».", "The drum pattern is approximate — check it by ear and fix it in Drums.")
        : t("Прибор нашёл повторяющийся рисунок ударных. Он годится как отправная точка для рецепта; хэты и тихие удары часто пропускаются.", "The engine found a repeating drum pattern. It's a fair starting point for the recipe; hats and quiet hits are often missed."),
      tryThis: t("Сыграй паттерн A из «Рецепта» и сравни с треком — правь шаги, которые слышишь иначе.", "Play pattern A from the Recipe and compare it with the track — edit the steps you hear differently."),
      details: [[t("Бочка / такт", "Kicks / bar"), per(["KICK"]).toFixed(1)], [t("Снейр+клэп / такт", "Snare+clap / bar"), per(["SNARE", "CLAP"]).toFixed(1)], [t("Хэты / такт", "Hats / bar"), per(["CLOSED_HAT", "OPEN_HAT"]).toFixed(1)],
        [t("Уверенность (медиана)", "Confidence (median)"), pct(conf)], [t("Примечание", "Note"), t("Показатели «синкопа» и «четыре в пол» пока не объясняются: на реальных треках они не различают жанры.", "“Syncopation” and “four on the floor” aren't explained yet: on real tracks they don't separate genres.")]] });
  }
  // ---- bass
  const bs = bassSummary(a.bass, minConfidence);
  if (bs.count > 0) {
    const level = levelOf(bs.confidence);
    cards.push({ id: "bass", level, headline: `${bs.count} ${t("нот баса", "bass notes")}`,
      body: level === "low" ? t("Ноты баса найдены неуверенно — это ориентир, а не транскрипция.", "The bass notes are uncertain — a guide, not a transcription.")
        : t(`Чаще всего: ${bs.top.map((x) => x.name).join(", ")}. Для SP достаточно сыграть этими нотами 1–2 такта.`, `Most often: ${bs.top.map((x) => x.name).join(", ")}. On the SP, playing these notes over a bar or two is enough.`),
      tryThis: t("Включи «Бас» и сыграй найденные ноты синтезатором, потом сделай такой же бас в SOUND GENERATOR.", "Open Bass, play the found notes on the synth, then build a similar bass in SOUND GENERATOR."),
      learn: [{ type: "lesson", id: "inter-08-bass-creation" }],
      details: [[t("Чаще всего", "Most common"), bs.top.map((x) => `${x.name} ×${x.count}`).join(", ")], [t("Самая низкая", "Lowest"), bs.lowest != null ? noteName(bs.lowest) : "—"], [t("Уверенность (медиана)", "Confidence (median)"), pct(bs.confidence)]] });
  } else {
    cards.push({ id: "bass", level: "low", headline: t("Бас не найден", "No bass found"),
      body: t("Отдельных нот баса не нашлось. Если в треке есть бас, скачай модель стемов в Настройках и проанализируй заново.", "No separate bass notes were found. If the track has bass, download the stem model in Settings and analyse again."), details: [] });
  }
  // ---- vocals (needs stems)
  const va = a.characteristics.vocal_activity;
  if (typeof va === "number") {
    cards.push({ id: "vocals", level: "medium", headline: `${t("Вокал в", "Vocals in")} ${pct(va)} ${t("тактов", "of bars")}`,
      body: va >= 0.15 ? t("Есть вокал — хороший материал для чопов. Оценка приблизительная: стем бывает с «просачиванием».", "There are vocals — good material for chops. The estimate is approximate: the stem can have bleed.")
        : t("Вокала мало или нет — это скорее инструментал.", "Few or no vocals — this is mostly instrumental."),
      tryThis: va >= 0.15 ? t("Выгрузи вокал во вкладке «Стемы» («По фразам») и нарежь на пэды.", "Export the vocal in Stems (“By phrases”) and chop it onto pads.") : undefined,
      learn: va >= 0.15 ? [{ type: "lesson", id: "inter-10-vocal-chops" }] : undefined, details: [[t("Доля тактов с вокалом", "Share of bars with vocals"), pct(va)]] });
  }
  return cards;
}
