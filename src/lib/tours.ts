import { t } from "./i18n";
import type { Screen } from "../state/store";

export interface TourStep { selector?: string; title: string; text: string; place?: "right" | "left" | "top" | "bottom" }
export interface Tour { id: string; steps: TourStep[] }

export const TOURS: Record<string, Tour> = {
  welcome: { id: "welcome", steps: [
    { title: t("Добро пожаловать в SP-404 LEARN", "Welcome to SP-404 LEARN"), text: t("Здесь учатся играть на SP-404MKII: курсы по жанрам, упражнения с эффектами, короткие приёмы и разбор собственных треков. Давай быстро посмотрим, что где.", "Learn to play the SP-404MKII here: genre courses, effect exercises, short techniques and breakdowns of your own tracks. Let's take a quick look around.") },
    { selector: "[data-tour=path]", place: "bottom", title: t("Учебный путь", "Learning path"), text: t("Если не знаешь, с чего начать — иди по пути «SP-404 с нуля»: здесь виден следующий урок и общий прогресс.", "If you are not sure where to start, follow “SP-404 from zero”: the next lesson and your overall progress are shown here.") },
    { selector: "[data-tour=continue]", place: "bottom", title: t("Продолжить обучение", "Continue learning"), text: t("Главное на главной — твой текущий курс: урок, прогресс и кнопка «Продолжить». Прогресс хранится только на этом компьютере.", "The main thing on Home is your current course: lesson, progress and the Continue button. Progress is stored only on this computer.") },
    { selector: "[data-tour=areas]", place: "top", title: t("Практика и справка", "Practice and reference"), text: t("FX Lab — эффекты через упражнения. Tricks — короткие приёмы. Track Lab — разбор твоего трека. Reference — короткие ответы про кнопки и понятия.", "FX Lab — effects through exercises. Tricks — short techniques. Track Lab — breakdown of your track. Reference — short answers about buttons and concepts.") },
    { selector: "[data-tour=sidebar]", place: "right", title: t("Шесть разделов", "Six sections"), text: t("Главная, Курсы, FX Lab, Tricks, Track Lab и Reference всегда слева. Когда откроешь трек, под Track Lab появятся Трек, Стемы, Ударные, Бас, Структура и Рецепт SP.", "Home, Courses, FX Lab, Tricks, Track Lab and Reference are always on the left. Once you open a track, Track, Stems, Drums, Bass, Structure and SP Recipe appear under Track Lab.") },
    { selector: "[data-tour=nav-settings]", place: "right", title: t("Модель стемов", "Stem model"), text: t("Чтобы разделять трек на ударные, бас, лид и вокал, один раз скачай модель (~80 МБ) в Настройках. После этого всё работает офлайн.", "To split a track into drums, bass, lead and vocals, download the model (~80 MB) once in Settings. After that everything works offline.") },
    { title: t("Готово!", "All set!"), text: t("Начни с курса или с «Продолжить». Подсказки по любому экрану можно повторить кнопкой «? Подсказки» вверху.", "Start with a course or with Continue. You can replay the tips for any screen with the “? Tips” button at the top.") },
  ] },
  courses: { id: "courses", steps: [
    { selector: "[data-tour=paths]", place: "top", title: t("Учебные пути", "Learning paths"), text: t("«SP-404 с нуля» — 22 урока для старта, «Средний уровень» — 16 уроков глубже. Каждый шаг с кнопками сверен с руководством Roland; пройденные уроки отмечаются.", "“SP-404 from zero” is 22 lessons to get started; “Intermediate” is 16 lessons going deeper. Every button step is checked against Roland's manual; finished lessons get ticked off.") },
    { selector: "[data-tour=courses]", place: "top", title: t("Курсы по жанрам", "Genre courses"), text: t("У каждого жанра свой знак, темп и уроки. Прогресс виден на карточке; «с начала» сбрасывает его.", "Each genre has its own symbol, tempo and lessons. Progress shows on the card; “restart” resets it.") },
  ] },
  fxlab: { id: "fxlab", steps: [
    { selector: "[data-tour=fxlist]", place: "top", title: t("FX Lab", "FX Lab"), text: t("Открой эффект: что он делает, какие у него параметры, как попробовать пошагово. Показываются только описания, сверенные с руководством Roland.", "Open an effect: what it does, its parameters and how to try it step by step. Only descriptions checked against the Roland manual are shown.") },
  ] },
  tricks: { id: "tricks", steps: [
    { selector: "[data-tour=tricklist]", place: "top", title: t("Tricks", "Tricks"), text: t("Короткие приёмы на несколько шагов. Схема SP-404MKII подсвечивает кнопки и пэды, о которых идёт речь.", "Short techniques of a few steps. The SP-404MKII diagram highlights the buttons and pads involved.") },
  ] },
  reference: { id: "reference", steps: [
    { selector: "[data-tour=refsearch]", place: "bottom", title: t("Reference", "Reference"), text: t("Ищи кнопку, понятие или эффект — получишь короткий ответ и ссылку на подробный приём.", "Search for a button, concept or effect — you get a short answer and a link to the detailed technique.") },
  ] },
  track: { id: "track", steps: [
    { selector: "[data-tour=waveform]", place: "bottom", title: t("Волна трека", "Track waveform"), text: t("Нажми «Играть» внизу, чтобы послушать трек. Клик по волне перематывает; выделенный такт — тот, что открыт в разделе «Ударные».", "Press Play at the bottom to hear the track. Click the waveform to seek; the highlighted bar is the one open in Drums.") },
    { selector: "[data-tour=bpm]", place: "bottom", title: t("Темп и сетка", "Tempo and grid"), text: t("Если темп определился вдвое быстрее или медленнее — жми ÷2 / ×2. Кнопки «Доля» и «Шаг» двигают сетку, если она сдвинута.", "If the tempo was detected twice as fast or slow, press ÷2 / ×2. The Beat and Step buttons move the grid if it is shifted.") },
    { selector: "[data-tour=sections]", place: "top", title: t("Структура трека", "Track structure"), text: t("Интро, дроп, брейк, аутро — каждая часть своего цвета. Нажми на блок, и он заиграет по кругу.", "Intro, drop, break, outro — each part has its own colour. Click a block to loop it.") },
    { selector: "[data-tour=sidebar]", place: "right", title: t("Что дальше", "What next"), text: t("Стемы — послушать партии по отдельности. Ударные и Бас — проверить и поправить найденные ноты. Рецепт SP — готовая инструкция для сэмплера.", "Stems — hear the parts separately. Drums and Bass — check and fix the detected notes. SP Recipe — ready instructions for the sampler.") },
    { selector: "[data-tour=transport]", place: "top", title: t("Плеер", "Player"), text: t("На «Треке» и «Стемах» играет твоё аудио, на «Ударных», «Басе» и «Рецепте» — синтезатор: слышно именно то, что нарисовано на сетке.", "On Track and Stems your own audio plays; on Drums, Bass and Recipe a synth plays exactly what is drawn on the grid.") },
  ] },
  stems: { id: "stems", steps: [
    { selector: "[data-tour=lanes]", place: "top", title: t("Четыре партии", "Four parts"), text: t("Ударные, бас, лид (всё остальное) и вокал. M — выключить партию, S — оставить только её. Клик по дорожке перематывает.", "Drums, bass, lead (everything else) and vocals. M mutes a part, S solos it. Click a lane to seek.") },
  ] },
  drums: { id: "drums", steps: [
    { selector: "[data-tour=where]", place: "bottom", title: t("Где этот такт в треке", "Where this bar is in the track"), text: t("Белая рамка на волне — текущий такт. Стрелки ◀ ▶ или клик по волне переключают такты. Рядом видно, к какой секции он относится.", "The white frame on the waveform is the current bar. Arrows ◀ ▶ or a click on the waveform switch bars. Next to it you can see which section it belongs to.") },
    { selector: "[data-tour=drum-grid]", place: "top", title: t("Сетка ударных", "Drum grid"), text: t("Один такт — 16 шагов. Клик по пустой клетке добавляет удар, по цветной — выбирает его (настройки появятся справа). Полосатые клетки — алгоритм не уверен; ползунок «Порог уверенности» их скрывает.", "One bar is 16 steps. Click an empty cell to add a hit, a coloured one to select it (settings appear on the right). Striped cells mean the algorithm is unsure; the Confidence threshold slider hides them.") },
    { selector: "[data-tour=inspector]", place: "left", title: t("Выбранный удар", "Selected hit"), text: t("Здесь меняются инструмент, громкость и положение выбранного удара. Кнопки «▶ Синтезатор» и «▶ Стем ударных» сверху проигрывают такт.", "Change the instrument, volume and position of the selected hit here. The “▶ Synth” and “▶ Drum stem” buttons at the top play the bar.") },
  ] },
  bass: { id: "bass", steps: [
    { selector: "[data-tour=roll]", place: "top", title: t("Ноты баса", "Bass notes"), text: t("Каждая полоска — нота: высота слева, шаг сверху. «▶ Синтезатор» играет найденные ноты, «▶ Оригинал баса» — настоящий бас из стема. Так можно проверить, всё ли верно найдено.", "Each bar is a note: pitch on the left, step on top. “▶ Synth” plays the detected notes, “▶ Original bass” plays the real bass from the stem. This way you can check that everything was found correctly.") },
  ] },
  structure: { id: "structure", steps: [
    { selector: "[data-tour=struct]", place: "bottom", title: t("Структура", "Structure"), text: t("Нажми на блок или «▶ Слушать» на карточке — секция заиграет по кругу. «Провалиться ↓» открывает ударные с первого такта секции, «Паттерн» — её рецепт.", "Click a block or “▶ Listen” on a card — the section loops. “Dive in ↓” opens the drums at the section's first bar, “Pattern” opens its recipe.") },
  ] },
  recipe: { id: "recipe", steps: [
    { selector: "[data-tour=pattern]", place: "top", title: t("Паттерны A–D", "Patterns A–D"), text: t("Трек упрощён до нескольких паттернов. Выбери вкладку — подсветятся секции, где он звучит. Клик по клетке правит шаг, «▶ Играть» внизу проигрывает паттерн.", "The track is simplified into a few patterns. Pick a tab to highlight the sections where it plays. Click a cell to edit a step; “▶ Play” at the bottom plays the pattern.") },
    { selector: "[data-tour=kit]", place: "top", title: t("Кит на SP-404", "Kit on the SP-404"), text: t("Какой инструмент на каком пэде. Цветная рамка — пэд нужен этому паттерну. Нажми на пэд и выбери, что на нём лежит.", "Which instrument is on which pad. A coloured frame means the pad is used by this pattern. Click a pad to choose what lives on it.") },
    { selector: "[data-tour=learn-track]", place: "bottom", title: t("Учить этот трек", "Learn this track"), text: t("Пошаговый урок: какой сэмпл на какой пэд, какие шаги включить. Проходи по кнопке «Далее».", "A step-by-step lesson: which sample on which pad, which steps to turn on. Go through it with the Next button.") },
  ] },
};

export const tourForScreen = (s: Screen): string | null => (s in TOURS ? s : s === "home" ? "welcome" : null);

const KEY = "sp404learn.tours";
export function seenTours(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function markSeen(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...seenTours(), id])])); } catch { /* storage unavailable */ }
}
