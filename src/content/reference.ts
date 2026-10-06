import { SRC } from "./sources";
import type { RefEntry } from "./types";

export const REFERENCE: RefEntry[] = [
  { id: "pattern-select", term: "[PATTERN SELECT]", category: "controls", status: "verified", answer: "Вход в паттерн-секвенсор: отсюда создают и выбирают паттерны.", see: { area: "trick", id: "tr-rec" }, sources: [SRC.trrec] },
  { id: "rec", term: "[REC]", category: "controls", status: "verified", answer: "Начинает запись: в TR-REC — запись паттерна, в skip-back — сохранение захваченного звука на пэд.", sources: [SRC.trrec, SRC.skipback] },
  { id: "remain", term: "[REMAIN]", category: "controls", status: "verified", answer: "В режиме записи паттерна переключает способ записи на «TR-REC»; в редакторе цепочки паттернов переключает повтор (All / Current / Off).", sources: [SRC.trrec, SRC.chain] },
  { id: "sub-pad", term: "[SUB PAD]", category: "controls", status: "verified", answer: "Удерживая её в TR-REC, выбираешь пэд с сэмплом; в цепочке паттернов запускает и останавливает воспроизведение.", sources: [SRC.trrec, SRC.chain] },
  { id: "exit", term: "[EXIT]", category: "controls", status: "verified", answer: "Завершает действие и возвращает к предыдущему экрану: в MUTE GROUP сохраняет настройки, в TR-REC два нажатия сохраняют паттерн. В skip-back без назначения на пэд память теряется.", sources: [SRC.mute, SRC.skipback] },
  { id: "mark", term: "[MARK]", category: "controls", status: "verified", answer: "В skip-back показывает волну захваченного звука; мигает, когда звук записывается в skip-back память.", see: { area: "trick", id: "skip-back" }, sources: [SRC.skipback] },
  { id: "shift", term: "[SHIFT]", category: "controls", status: "verified", answer: "Модификатор: вместе с пэдами открывает экраны и функции (например, [SHIFT] + пэд [8] — MUTE GROUP).", sources: [SRC.mute] },
  { id: "hold", term: "[HOLD]", category: "controls", status: "verified", answer: "Удерживая её и нажимая пэды [1]–[16], выбирают номер цепочки паттернов.", see: { area: "trick", id: "pattern-chain" }, sources: [SRC.chain] },
  { id: "value", term: "[VALUE]", category: "controls", status: "verified", answer: "Ручка выбора значений (например, группа A–J в MUTE GROUP). Если удерживать её и крутить ручки CTRL, открываются дополнительные параметры эффекта.", sources: [SRC.mute, SRC.bus] },
  { id: "ctrl", term: "[CTRL 1]–[CTRL 3]", category: "controls", status: "verified", answer: "Ручки, которыми меняют параметры включённого эффекта; какая за что — видно на дисплее.", sources: [SRC.bus] },
  { id: "fx-buttons", term: "Кнопки эффектов", category: "controls", status: "verified", answer: "[FILTER+DRIVE], [RESONATOR], [DELAY], [ISOLATOR], [DJFX LOOPER], [MFX] включают эффект; их назначение можно менять (DIRECT FX).", sources: [SRC.bus] },
  { id: "resample", term: "[RESAMPLE]", category: "controls", status: "verified", answer: "Сэмплирование паттерна в новый сэмпл на пэд.", see: { area: "trick", id: "resample-pattern" }, sources: [SRC.resample] },
  { id: "del", term: "[DEL]", category: "controls", status: "verified", answer: "В редакторе цепочки паттернов удаляет паттерн под курсором; [SHIFT] + [DEL] отменяет правки.", sources: [SRC.chain] },
  { id: "skipback-mem", term: "Skip-back память", category: "concepts", status: "verified", answer: "Хранит последние до 25 секунд звука (до 40 при Mark Function = «SBS Long»). Теряется, если не назначить на пэд до [EXIT] или выключения.", see: { area: "trick", id: "skip-back" }, sources: [SRC.skipback] },
  { id: "mute-group-def", term: "Mute Group", category: "concepts", status: "verified", answer: "До 10 групп (A–J) по 16 сэмплов; в группе звучит только последний сыгранный пэд.", see: { area: "trick", id: "mute-group" }, sources: [SRC.mute] },
  { id: "pad-colors", term: "Цвет мигающих пэдов", category: "concepts", status: "verified", answer: "При записи паттерна пустые пэды мигают красным, а пэды с уже записанным паттерном — синим.", sources: [SRC.resample, SRC.trrec] },
  { id: "tr-rec-def", term: "TR-REC", category: "workflow", status: "verified", answer: "Способ записи паттерна по шагам: пэды [1]–[16] — это шаги, сэмпл выбирается удержанием [SUB PAD].", see: { area: "trick", id: "tr-rec" }, sources: [SRC.trrec] },
  { id: "chain-def", term: "Цепочка паттернов", category: "workflow", status: "verified", answer: "Порядок паттернов, который играет сам; номер цепочки выбирают удерживая [HOLD] и нажимая пэд.", see: { area: "trick", id: "pattern-chain" }, sources: [SRC.chain] },
  { id: "sc-mute", term: "[SHIFT] + пэд [8]", category: "shortcuts", status: "verified", answer: "Открывает экран MUTE GROUP.", see: { area: "trick", id: "mute-group" }, sources: [SRC.mute] },
  { id: "sc-click", term: "[SHIFT] + пэд [9]", category: "shortcuts", status: "verified", answer: "Включает и выключает метроном (параметр SYSTEM «CLICK»).", sources: [SRC.resample] },
  { id: "fx-djfx", term: "DJFX Looper", category: "effects", status: "verified", answer: "Зацикливает звук короткими циклами, меняет направление и скорость (LENGTH, SPEED, LOOP SW).", see: { area: "fx", id: "djfx-looper" }, sources: [SRC.djfx] },
  { id: "fx-filter", term: "Filter+Drive", category: "effects", status: "verified", answer: "Фильтр с овердрайвом: CUTOFF, RESONANCE, DRIVE, FLT TYPE, LOW FREQ, LOW GAIN.", see: { area: "fx", id: "filter-drive" }, sources: [SRC.filter] },
  { id: "fx-resonator", term: "Resonator", category: "effects", status: "verified", answer: "Резонаторы на нотах или аккорде: ROOT, BRIGHT, FEEDBACK, CHORD, PANNING, ENV MOD.", see: { area: "fx", id: "resonator" }, sources: [SRC.resonator] },
  { id: "fx-isolator", term: "Isolator", category: "effects", status: "verified", answer: "Раздельная регулировка низа, середины и верха (LOW, MID, HIGH).", see: { area: "fx", id: "isolator" }, sources: [SRC.isolator] },
];

export const CATEGORY_LABELS: Record<string, string> = { controls: "Кнопки и ручки", concepts: "Понятия", shortcuts: "Сочетания", effects: "Эффекты", workflow: "Рабочий процесс" };

/** Plain filter: matches term and answer, case-insensitive, optional category. */
export function searchReference(entries: RefEntry[], query: string, category?: string | null): RefEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((e) => e.status === "verified" && (!category || e.category === category)
    && (!q || e.term.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q)));
}
