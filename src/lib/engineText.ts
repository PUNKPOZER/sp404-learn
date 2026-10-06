import { lang } from "./i18n";

/** The analysis engine stores short notes in Russian (they are cached with the analysis). This shows them in the UI language. */
const EXACT: Record<string, string> = {
  "Ноты баса взяты из полного микса (без стемов) и приблизительны.": "Bass notes were taken from the full mix (no stems) and are approximate.",
  "Модель стемов не установлена — анализирую полный микс (хэты под снейром/бочкой и ноты баса менее надёжны).": "The stem model is not installed — analysing the full mix (hats under the snare/kick and bass notes are less reliable).",
  "Среда разделения на стемы (PyTorch + Demucs) не установлена.": "The stem separation runtime (PyTorch + Demucs) is not installed.",
  "Модель стемов ещё не скачана (Настройки → Хранилище моделей → Скачать, ~80 МБ) — анализирую полный микс.": "The stem model is not downloaded yet (Settings → Model storage → Download, ~80 MB) — analysing the full mix.",
  "Хип-хоп": "Hip-Hop",
  "медленный темп, бэкбит": "slow tempo, backbeat",
  "синкопированный средний темп": "syncopated mid tempo",
};
const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Воспроизведение трека недоступно \((.*)\)\.$/s, (m) => `Track playback is unavailable (${m[1]}).`],
  [/^Разделение на стемы не удалось \((.*)\); анализирую полный микс\.$/s, (m) => `Stem separation failed (${m[1]}); analysing the full mix.`],
  [/^Анализ баса не удался \((.*)\)\.$/s, (m) => `Bass analysis failed (${m[1]}).`],
  [/^Анализ структуры не удался \((.*)\)\.$/s, (m) => `Structure analysis failed (${m[1]}).`],
  [/^(\d+) BPM, синкопа (\d+%)$/, (m) => `${m[1]} BPM, syncopation ${m[2]}`],
  [/^четыре в пол (\d+%)$/, (m) => `four on the floor ${m[1]}`],
  [/^(\d+) BPM, частые хэты$/, (m) => `${m[1]} BPM, busy hats`],
];

export function engineText(s: string): string {
  if (lang !== "en") return s;
  if (EXACT[s]) return EXACT[s];
  for (const [re, f] of PATTERNS) { const m = s.match(re); if (m) return f(m); }
  return s;
}
