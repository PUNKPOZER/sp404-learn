import { SRC } from "./sources";
import type { FxEntry } from "./types";

export const FX: FxEntry[] = [
  {
    id: "djfx-looper", name: "DJFX Looper", button: "DJFX LOOPER", status: "verified",
    whatItDoes: "Зацикливает звук короткими циклами и меняет направление и скорость воспроизведения — получается эффект проигрывателя.",
    params: [
      { id: "length", label: "LENGTH", range: "0.230–0.012 с", meaning: "Длина цикла." },
      { id: "speed", label: "SPEED", range: "−100…100", meaning: "Направление и скорость: отрицательное — назад, 0 — остановка, положительное — вперёд." },
      { id: "loop", label: "LOOP SW", range: "OFF / ON", meaning: "Включи, пока звук играет — он зациклится на длину LENGTH." },
    ],
    tryThis: [
      { text: "Нажми [DJFX LOOPER] — эффект включится.", controls: ["DJFX LOOPER"] },
      { text: "Нажимай пэды [1]–[16] и играй сэмпл." },
      { text: "Покрути [CTRL 1]–[CTRL 3] и смотри на дисплей: так ты найдёшь, какая ручка отвечает за LENGTH, SPEED и LOOP SW.", controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
      { text: "Включи LOOP SW, пока сэмпл звучит, — звук зациклится на длину LENGTH." },
      { text: "Меняй LENGTH: цикл станет длиннее или короче. Меняй SPEED: звук пойдёт вперёд, назад или остановится." },
      { text: "Нужны дополнительные параметры эффекта — удерживай [VALUE] и крути ручки.", controls: ["VALUE", "CTRL 1", "CTRL 2", "CTRL 3"] },
    ],
    useFor: ["Повтор коротких кусков (бит-репит)", "Звук «скретча»: вперёд, назад, остановка", "Остановка и разгон звука (SPEED = 0 и обратно)"],
    tip: "В статье Roland про SP-404SX CTRL 1 — длина цикла, CTRL 2 — скорость, CTRL 3 — вкл/выкл. На MK2 назначение ручек проверяй по дисплею.",
    practice: "Запусти барабанный пэд, включи LOOP SW и сыграй три разные длины цикла подряд; затем один проход назад (SPEED < 0).",
    sources: [SRC.djfx, SRC.bus, SRC.djfxArticle],
  },
  {
    id: "filter-drive", name: "Filter+Drive", button: "FILTER+DRIVE", status: "verified",
    whatItDoes: "Фильтр с овердрайвом: срезает заданные частоты и добавляет дисторшн.",
    params: [
      { id: "cutoff", label: "CUTOFF", range: "20–16000 Гц", meaning: "Частота среза." },
      { id: "resonance", label: "RESONANCE", range: "0–100", meaning: "Чем больше значение, тем сильнее подчёркивается область около CUTOFF." },
      { id: "drive", label: "DRIVE", range: "0–100", meaning: "Добавляет дисторшн." },
      { id: "type", label: "FLT TYPE", range: "HPF / LPF", meaning: "Тип фильтра: HPF срезает низкие частоты, LPF — высокие." },
      { id: "lowfreq", label: "LOW FREQ", range: "20–16000 Гц", meaning: "Частота, которую поднимают или срезают." },
      { id: "lowgain", label: "LOW GAIN", range: "−24…24 дБ", meaning: "Величина подъёма или среза." },
    ],
    tryThis: [
      { text: "Нажми [FILTER+DRIVE] — эффект включится.", controls: ["FILTER+DRIVE"] },
      { text: "Нажимай пэды [1]–[16] и играй сэмпл." },
      { text: "Крути [CTRL 1]–[CTRL 3], глядя на дисплей, — слушай, как меняется звук.", controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
      { text: "Дополнительные параметры (например FLT TYPE) открываются, если удерживать [VALUE] и крутить ручки.", controls: ["VALUE"] },
    ],
    useFor: ["Срезать низкие или высокие частоты", "Добавить дисторшн (DRIVE)", "Подчеркнуть область около частоты среза (RESONANCE)"],
    practice: "Играй барабанный луп и медленно двигай CUTOFF от одного края к другому; затем добавь DRIVE.",
    sources: [SRC.filter, SRC.bus],
  },
  {
    id: "resonator", name: "Resonator", button: "RESONATOR", status: "verified",
    whatItDoes: "Резонатор на синтезе Карплуса–Стронга: окрашивает звук максимум шестью резонаторами, настроенными на ноты или аккорд.",
    params: [
      { id: "root", label: "ROOT", range: "C1–G9", meaning: "Опорная нота." },
      { id: "bright", label: "BRIGHT", range: "0–100", meaning: "Яркость тембра." },
      { id: "feedback", label: "FEEDBACK", range: "0–99 %", meaning: "Величина обратной связи." },
      { id: "chord", label: "CHORD", meaning: "Какие ноты резонируют вместе." },
      { id: "panning", label: "PANNING", range: "0–100", meaning: "Панорама резонатора." },
      { id: "envmod", label: "ENV MOD", range: "0–100", meaning: "Чем больше значение, тем сильнее обратная связь растёт вместе с уровнем входного сигнала." },
    ],
    tryThis: [
      { text: "Нажми [RESONATOR] — эффект включится.", controls: ["RESONATOR"] },
      { text: "Нажимай пэды [1]–[16] и играй сэмпл." },
      { text: "Крути [CTRL 1]–[CTRL 3], глядя на дисплей.", controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
      { text: "Дополнительные параметры открываются, если удерживать [VALUE] и крутить ручки.", controls: ["VALUE"] },
    ],
    useFor: ["Подстроить звук под тональность (ROOT) или аккорд (CHORD)", "Добавить тональную окраску ударным и шумам"],
    practice: "Пропусти шумовой или барабанный сэмпл через Resonator и подбери ROOT, чтобы он звучал в тональности твоего баса.",
    sources: [SRC.resonator, SRC.bus],
  },
  {
    id: "isolator", name: "Isolator", button: "ISOLATOR", status: "verified",
    whatItDoes: "Убирает звук в заданном диапазоне частот — раздельная регулировка низа, середины и верха.",
    params: [
      { id: "low", label: "LOW", range: "−∞…+12 дБ", meaning: "Низкие частоты." },
      { id: "mid", label: "MID", range: "−∞…+12 дБ", meaning: "Средние частоты." },
      { id: "high", label: "HIGH", range: "−∞…+12 дБ", meaning: "Высокие частоты." },
    ],
    tryThis: [
      { text: "Нажми [ISOLATOR] — эффект включится.", controls: ["ISOLATOR"] },
      { text: "Нажимай пэды [1]–[16] и играй сэмпл." },
      { text: "Крути [CTRL 1]–[CTRL 3], глядя на дисплей, и по очереди убирай диапазоны.", controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
    ],
    useFor: ["Убрать низ, середину или верх из сэмпла", "Оставить только один диапазон частот"],
    practice: "Играй полный луп и по очереди «выключай» LOW, MID и HIGH — запомни, что несёт каждый диапазон.",
    sources: [SRC.isolator, SRC.bus],
  },
  // ---- planned, NOT shown in the app until checked against the manual ----
  ...["Delay", "MFX (Reverb и другие)", "Cassette Sim", "Vinyl Sim", "Lo-fi", "Tape Echo"].map<FxEntry>((n) => ({
    id: n.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: n, status: "todo", whatItDoes: "", params: [], tryThis: [], useFor: [], sources: [],
  })),
];
