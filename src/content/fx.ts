import { t } from "../lib/i18n";
import { SRC } from "./sources";
import type { FxEntry } from "./types";

export const FX: FxEntry[] = [
  {
    id: "djfx-looper", name: "DJFX Looper", button: "DJFX LOOPER", status: "verified",
    whatItDoes: t("Зацикливает звук короткими циклами и меняет направление и скорость воспроизведения — получается эффект проигрывателя.", "Loops the sound in short cycles and changes the playback direction and speed — a turntable-style effect."),
    params: [
      { id: "length", label: "LENGTH", range: t("0.230–0.012 с", "0.230–0.012 s"), meaning: t("Длина цикла.", "Loop length.") },
      { id: "speed", label: "SPEED", range: "−100…100", meaning: t("Направление и скорость: отрицательное — назад, 0 — остановка, положительное — вперёд.", "Direction and speed: negative is backwards, 0 is a stop, positive is forwards.") },
      { id: "loop", label: "LOOP SW", range: "OFF / ON", meaning: t("Включи, пока звук играет — он зациклится на длину LENGTH.", "Turn it on while the sound plays — it loops at the LENGTH.") },
    ],
    tryThis: [
      { text: t("Нажми [DJFX LOOPER] — эффект включится.", "Press [DJFX LOOPER] — the effect turns on."), controls: ["DJFX LOOPER"] },
      { text: t("Нажимай пэды [1]–[16] и играй сэмпл.", "Press pads [1]–[16] and play the sample.") },
      { text: t("Покрути [CTRL 1]–[CTRL 3] и смотри на дисплей: так ты найдёшь, какая ручка отвечает за LENGTH, SPEED и LOOP SW.", "Turn [CTRL 1]–[CTRL 3] and watch the display: that's how you find which knob controls LENGTH, SPEED and LOOP SW."), controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
      { text: t("Включи LOOP SW, пока сэмпл звучит, — звук зациклится на длину LENGTH.", "Turn on LOOP SW while the sample sounds — it loops at the LENGTH.") },
      { text: t("Меняй LENGTH: цикл станет длиннее или короче. Меняй SPEED: звук пойдёт вперёд, назад или остановится.", "Change LENGTH: the loop gets longer or shorter. Change SPEED: the sound goes forwards, backwards or stops.") },
      { text: t("Нужны дополнительные параметры эффекта — удерживай [VALUE] и крути ручки.", "Need more effect parameters — hold [VALUE] and turn the knobs."), controls: ["VALUE", "CTRL 1", "CTRL 2", "CTRL 3"] },
    ],
    useFor: [t("Повтор коротких кусков (бит-репит)", "Repeating short pieces (beat repeat)"), t("Звук «скретча»: вперёд, назад, остановка", "A “scratch” sound: forwards, backwards, stop"), t("Остановка и разгон звука (SPEED = 0 и обратно)", "Stopping and speeding up a sound (SPEED = 0 and back)")],
    tip: t("В статье Roland про SP-404SX CTRL 1 — длина цикла, CTRL 2 — скорость, CTRL 3 — вкл/выкл. На MK2 назначение ручек проверяй по дисплею.", "In Roland's article about the SP-404SX, CTRL 1 is loop length, CTRL 2 is speed, CTRL 3 is on/off. On the MK2, check the knob assignment on the display."),
    practice: t("Запусти барабанный пэд, включи LOOP SW и сыграй три разные длины цикла подряд; затем один проход назад (SPEED < 0).", "Start a drum pad, turn on LOOP SW and play three different loop lengths in a row; then one pass backwards (SPEED < 0)."),
    sources: [SRC.djfx, SRC.bus, SRC.djfxArticle],
  },
  {
    id: "filter-drive", name: "Filter+Drive", button: "FILTER+DRIVE", status: "verified",
    whatItDoes: t("Фильтр с овердрайвом: срезает заданные частоты и добавляет дисторшн.", "A filter with overdrive: cuts the chosen frequencies and adds distortion."),
    params: [
      { id: "cutoff", label: "CUTOFF", range: t("20–16000 Гц", "20–16000 Hz"), meaning: t("Частота среза.", "Cutoff frequency.") },
      { id: "resonance", label: "RESONANCE", range: "0–100", meaning: t("Чем больше значение, тем сильнее подчёркивается область около CUTOFF.", "The higher the value, the more the area around CUTOFF is emphasised.") },
      { id: "drive", label: "DRIVE", range: "0–100", meaning: t("Добавляет дисторшн.", "Adds distortion.") },
      { id: "type", label: "FLT TYPE", range: "HPF / LPF", meaning: t("Тип фильтра: HPF срезает низкие частоты, LPF — высокие.", "Filter type: HPF cuts low frequencies, LPF cuts high ones.") },
      { id: "lowfreq", label: "LOW FREQ", range: t("20–16000 Гц", "20–16000 Hz"), meaning: t("Частота, которую поднимают или срезают.", "The frequency that is boosted or cut.") },
      { id: "lowgain", label: "LOW GAIN", range: t("−24…24 дБ", "−24…24 dB"), meaning: t("Величина подъёма или среза.", "Amount of boost or cut.") },
    ],
    tryThis: [
      { text: t("Нажми [FILTER+DRIVE] — эффект включится.", "Press [FILTER+DRIVE] — the effect turns on."), controls: ["FILTER+DRIVE"] },
      { text: t("Нажимай пэды [1]–[16] и играй сэмпл.", "Press pads [1]–[16] and play the sample.") },
      { text: t("Крути [CTRL 1]–[CTRL 3], глядя на дисплей, — слушай, как меняется звук.", "Turn [CTRL 1]–[CTRL 3] while watching the display — hear how the sound changes."), controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
      { text: t("Дополнительные параметры (например FLT TYPE) открываются, если удерживать [VALUE] и крутить ручки.", "Extra parameters (for example FLT TYPE) open when you hold [VALUE] and turn the knobs."), controls: ["VALUE"] },
    ],
    useFor: [t("Срезать низкие или высокие частоты", "Cut low or high frequencies"), t("Добавить дисторшн (DRIVE)", "Add distortion (DRIVE)"), t("Подчеркнуть область около частоты среза (RESONANCE)", "Emphasise the area around the cutoff (RESONANCE)")],
    practice: t("Играй барабанный луп и медленно двигай CUTOFF от одного края к другому; затем добавь DRIVE.", "Play a drum loop and slowly move CUTOFF from one end to the other; then add DRIVE."),
    sources: [SRC.filter, SRC.bus],
  },
  {
    id: "resonator", name: "Resonator", button: "RESONATOR", status: "verified",
    whatItDoes: t("Резонатор на синтезе Карплуса–Стронга: окрашивает звук максимум шестью резонаторами, настроенными на ноты или аккорд.", "A resonator based on Karplus–Strong synthesis: colours the sound with up to six resonators tuned to notes or a chord."),
    params: [
      { id: "root", label: "ROOT", range: "C1–G9", meaning: t("Опорная нота.", "Root note.") },
      { id: "bright", label: "BRIGHT", range: "0–100", meaning: t("Яркость тембра.", "Brightness of the tone.") },
      { id: "feedback", label: "FEEDBACK", range: "0–99 %", meaning: t("Величина обратной связи.", "Amount of feedback.") },
      { id: "chord", label: "CHORD", meaning: t("Какие ноты резонируют вместе.", "Which notes resonate together.") },
      { id: "panning", label: "PANNING", range: "0–100", meaning: t("Панорама резонатора.", "Resonator panning.") },
      { id: "envmod", label: "ENV MOD", range: "0–100", meaning: t("Чем больше значение, тем сильнее обратная связь растёт вместе с уровнем входного сигнала.", "The higher the value, the more the feedback grows with the input level.") },
    ],
    tryThis: [
      { text: t("Нажми [RESONATOR] — эффект включится.", "Press [RESONATOR] — the effect turns on."), controls: ["RESONATOR"] },
      { text: t("Нажимай пэды [1]–[16] и играй сэмпл.", "Press pads [1]–[16] and play the sample.") },
      { text: t("Крути [CTRL 1]–[CTRL 3], глядя на дисплей.", "Turn [CTRL 1]–[CTRL 3] while watching the display."), controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
      { text: t("Дополнительные параметры открываются, если удерживать [VALUE] и крутить ручки.", "Extra parameters open when you hold [VALUE] and turn the knobs."), controls: ["VALUE"] },
    ],
    useFor: [t("Подстроить звук под тональность (ROOT) или аккорд (CHORD)", "Tune the sound to a key (ROOT) or chord (CHORD)"), t("Добавить тональную окраску ударным и шумам", "Add tonal colour to drums and noise")],
    practice: t("Пропусти шумовой или барабанный сэмпл через Resonator и подбери ROOT, чтобы он звучал в тональности твоего баса.", "Run a noise or drum sample through Resonator and set ROOT so it sounds in the key of your bass."),
    sources: [SRC.resonator, SRC.bus],
  },
  {
    id: "isolator", name: "Isolator", button: "ISOLATOR", status: "verified",
    whatItDoes: t("Убирает звук в заданном диапазоне частот — раздельная регулировка низа, середины и верха.", "Removes sound in a chosen frequency range — separate control of lows, mids and highs."),
    params: [
      { id: "low", label: "LOW", range: t("−∞…+12 дБ", "−∞…+12 dB"), meaning: t("Низкие частоты.", "Low frequencies.") },
      { id: "mid", label: "MID", range: t("−∞…+12 дБ", "−∞…+12 dB"), meaning: t("Средние частоты.", "Mid frequencies.") },
      { id: "high", label: "HIGH", range: t("−∞…+12 дБ", "−∞…+12 dB"), meaning: t("Высокие частоты.", "High frequencies.") },
    ],
    tryThis: [
      { text: t("Нажми [ISOLATOR] — эффект включится.", "Press [ISOLATOR] — the effect turns on."), controls: ["ISOLATOR"] },
      { text: t("Нажимай пэды [1]–[16] и играй сэмпл.", "Press pads [1]–[16] and play the sample.") },
      { text: t("Крути [CTRL 1]–[CTRL 3], глядя на дисплей, и по очереди убирай диапазоны.", "Turn [CTRL 1]–[CTRL 3] while watching the display and remove the ranges one by one."), controls: ["CTRL 1", "CTRL 2", "CTRL 3"] },
    ],
    useFor: [t("Убрать низ, середину или верх из сэмпла", "Remove the lows, mids or highs from a sample"), t("Оставить только один диапазон частот", "Keep only one frequency range")],
    practice: t("Играй полный луп и по очереди «выключай» LOW, MID и HIGH — запомни, что несёт каждый диапазон.", "Play a full loop and “switch off” LOW, MID and HIGH in turn — remember what each range carries."),
    sources: [SRC.isolator, SRC.bus],
  },
  // ---- planned, NOT shown in the app until checked against the manual ----
  ...["Delay", t("MFX (Reverb и другие)", "MFX (Reverb and others)"), "Cassette Sim", "Vinyl Sim", "Lo-fi", "Tape Echo"].map<FxEntry>((n) => ({
    id: n.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: n, status: "todo", whatItDoes: "", params: [], tryThis: [], useFor: [], sources: [],
  })),
];
