import type { Screen } from "../state/store";

export interface TourStep { selector?: string; title: string; text: string; place?: "right" | "left" | "top" | "bottom" }
export interface Tour { id: string; steps: TourStep[] }

export const TOURS: Record<string, Tour> = {
  welcome: { id: "welcome", steps: [
    { title: "Добро пожаловать в SP-404 LEARN", text: "Приложение разбирает любой трек на ударные, бас и структуру и показывает, как повторить его ритм на SP-404MKII — шаг за шагом. Давай быстро пройдёмся по интерфейсу (это займёт минуту)." },
    { selector: "[data-tour=drop]", place: "bottom", title: "1. Перетащи трек сюда", text: "Бросай сюда WAV, MP3, FLAC, M4A или AIFF — или нажми на зону. Всё считается на твоём компьютере, аудио никуда не отправляется." },
    { selector: "[data-tour=learn-card]", place: "top", title: "Или учись без трека", text: "Готовые курсы по жанрам — Footwork, Jungle, Breakbeat, House, Hip-Hop, Techno, Trip-Hop, Lo-Fi House и Lo-Fi Hip-Hop: от раскладки пэдов до собственного трека. Подходит, если референса пока нет." },
    { selector: "[data-tour=sidebar]", place: "right", title: "2. Этапы слева", text: "После анализа здесь открываются разделы: Трек (темп и структура), Стемы (разбор на партии), Ударные, Бас, Структура, Рецепт SP (что и куда класть на сэмплер) и Обучение." },
    { selector: "[data-tour=nav-settings]", place: "right", title: "3. Модель стемов", text: "Чтобы разделять трек на ударные, бас, лид и вокал, один раз скачай модель (~80 МБ) в Настройках. После этого всё работает офлайн." },
    { title: "Готово!", text: "Перетащи свой первый трек. На каждом экране я один раз коротко покажу, что где. Повторить подсказки можно кнопкой «? Подсказки» вверху." },
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
