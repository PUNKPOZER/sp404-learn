import type { Screen } from "../state/store";

export interface TourStep { selector?: string; title: string; text: string; place?: "right" | "left" | "top" | "bottom" }
export interface Tour { id: string; steps: TourStep[] }

export const TOURS: Record<string, Tour> = {
  welcome: { id: "welcome", steps: [
    { title: "Добро пожаловать в SP-404 LEARN", text: "Здесь учатся играть на SP-404MKII: курсы по жанрам, упражнения с эффектами, короткие приёмы и разбор собственных треков. Давай быстро посмотрим, что где." },
    { selector: "[data-tour=continue]", place: "bottom", title: "Продолжить обучение", text: "Главное на главной — твой текущий курс: урок, прогресс и кнопка «Продолжить». Прогресс хранится только на этом компьютере." },
    { selector: "[data-tour=areas]", place: "top", title: "Практика и справка", text: "FX Lab — эффекты через упражнения. Tricks — короткие приёмы. Track Lab — разбор твоего трека. Reference — короткие ответы про кнопки и понятия." },
    { selector: "[data-tour=sidebar]", place: "right", title: "Шесть разделов", text: "Главная, Курсы, FX Lab, Tricks, Track Lab и Reference всегда слева. Когда откроешь трек, под Track Lab появятся Трек, Стемы, Ударные, Бас, Структура и Рецепт SP." },
    { selector: "[data-tour=nav-settings]", place: "right", title: "Модель стемов", text: "Чтобы разделять трек на ударные, бас, лид и вокал, один раз скачай модель (~80 МБ) в Настройках. После этого всё работает офлайн." },
    { title: "Готово!", text: "Начни с курса или с «Продолжить». Подсказки по любому экрану можно повторить кнопкой «? Подсказки» вверху." },
  ] },
  courses: { id: "courses", steps: [
    { selector: "[data-tour=courses]", place: "top", title: "Курсы по жанрам", text: "У каждого жанра свой знак, темп и уроки. Прогресс виден на карточке; «с начала» сбрасывает его." },
  ] },
  fxlab: { id: "fxlab", steps: [
    { selector: "[data-tour=fxlist]", place: "top", title: "FX Lab", text: "Открой эффект: что он делает, какие у него параметры, как попробовать пошагово. Показываются только описания, сверенные с руководством Roland." },
  ] },
  tricks: { id: "tricks", steps: [
    { selector: "[data-tour=tricklist]", place: "top", title: "Tricks", text: "Короткие приёмы на несколько шагов. Схема SP-404MKII подсвечивает кнопки и пэды, о которых идёт речь." },
  ] },
  reference: { id: "reference", steps: [
    { selector: "[data-tour=refsearch]", place: "bottom", title: "Reference", text: "Ищи кнопку, понятие или эффект — получишь короткий ответ и ссылку на подробный приём." },
  ] },
  track: { id: "track", steps: [
    { selector: "[data-tour=waveform]", place: "bottom", title: "Волна трека", text: "Нажми «Играть» внизу, чтобы послушать трек. Клик по волне перематывает; выделенный такт — тот, что открыт в разделе «Ударные»." },
    { selector: "[data-tour=bpm]", place: "bottom", title: "Темп и сетка", text: "Если темп определился вдвое быстрее или медленнее — жми ÷2 / ×2. Кнопки «Доля» и «Шаг» двигают сетку, если она сдвинута." },
    { selector: "[data-tour=sections]", place: "top", title: "Структура трека", text: "Интро, дроп, брейк, аутро — каждая часть своего цвета. Нажми на блок, и он заиграет по кругу." },
    { selector: "[data-tour=sidebar]", place: "right", title: "Что дальше", text: "Стемы — послушать партии по отдельности. Ударные и Бас — проверить и поправить найденные ноты. Рецепт SP — готовая инструкция для сэмплера." },
    { selector: "[data-tour=transport]", place: "top", title: "Плеер", text: "На «Треке» и «Стемах» играет твоё аудио, на «Ударных», «Басе» и «Рецепте» — синтезатор: слышно именно то, что нарисовано на сетке." },
  ] },
  stems: { id: "stems", steps: [
    { selector: "[data-tour=lanes]", place: "top", title: "Четыре партии", text: "Ударные, бас, лид (всё остальное) и вокал. M — выключить партию, S — оставить только её. Клик по дорожке перематывает." },
  ] },
  drums: { id: "drums", steps: [
    { selector: "[data-tour=where]", place: "bottom", title: "Где этот такт в треке", text: "Белая рамка на волне — текущий такт. Стрелки ◀ ▶ или клик по волне переключают такты. Рядом видно, к какой секции он относится." },
    { selector: "[data-tour=drum-grid]", place: "top", title: "Сетка ударных", text: "Один такт — 16 шагов. Клик по пустой клетке добавляет удар, по цветной — выбирает его (настройки появятся справа). Полосатые клетки — алгоритм не уверен; ползунок «Порог уверенности» их скрывает." },
    { selector: "[data-tour=inspector]", place: "left", title: "Выбранный удар", text: "Здесь меняются инструмент, громкость и положение выбранного удара. Кнопки «▶ Синтезатор» и «▶ Стем ударных» сверху проигрывают такт." },
  ] },
  bass: { id: "bass", steps: [
    { selector: "[data-tour=roll]", place: "top", title: "Ноты баса", text: "Каждая полоска — нота: высота слева, шаг сверху. «▶ Синтезатор» играет найденные ноты, «▶ Оригинал баса» — настоящий бас из стема. Так можно проверить, всё ли верно найдено." },
  ] },
  structure: { id: "structure", steps: [
    { selector: "[data-tour=struct]", place: "bottom", title: "Структура", text: "Нажми на блок или «▶ Слушать» на карточке — секция заиграет по кругу. «Провалиться ↓» открывает ударные с первого такта секции, «Паттерн» — её рецепт." },
  ] },
  recipe: { id: "recipe", steps: [
    { selector: "[data-tour=pattern]", place: "top", title: "Паттерны A–D", text: "Трек упрощён до нескольких паттернов. Выбери вкладку — подсветятся секции, где он звучит. Клик по клетке правит шаг, «▶ Играть» внизу проигрывает паттерн." },
    { selector: "[data-tour=kit]", place: "top", title: "Кит на SP-404", text: "Какой инструмент на каком пэде. Цветная рамка — пэд нужен этому паттерну. Нажми на пэд и выбери, что на нём лежит." },
    { selector: "[data-tour=learn-track]", place: "bottom", title: "Учить этот трек", text: "Пошаговый урок: какой сэмпл на какой пэд, какие шаги включить. Проходи по кнопке «Далее»." },
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
