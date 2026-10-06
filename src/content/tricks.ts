import { SRC } from "./sources";
import type { Trick } from "./types";

export const TRICKS: Trick[] = [
  {
    id: "skip-back", title: "Skip Back: поймать то, что только что сыграл", topic: "skip back", status: "verified",
    summary: "Сэмплируй звук, который играл до этого, даже если запись не была включена.",
    steps: [
      { text: "Играй сэмпл или паттерн — или включи [EXT SOURCE] и играй на подключённом инструменте.", controls: ["EXT SOURCE"] },
      { text: "Когда звук превысит уровень триггера, прибор пишет в skip-back память, а кнопка [MARK] мигает." },
      { text: "Нажми [MARK]. После надписи «SKIP BACK…» на экране появится волна.", controls: ["MARK"] },
      { text: "Нажми [REC]. Появится «Select Pad To Save»: пустые пэды мигают красным.", controls: ["REC"] },
      { text: "Нажми один из пэдов [1]–[16] — аудио из skip-back памяти сохранится на него." },
    ],
    notes: [
      "По умолчанию хранится до 25 секунд; при параметре Mark Function = «SBS Long» — до 40 секунд.",
      "Если нажать [EXIT] или выключить прибор, не назначив память на пэд, она потеряется.",
      "Skip-back и looper одновременно использовать нельзя.",
    ],
    sources: [SRC.skipback],
  },
  {
    id: "mute-group", title: "Mute Group: не слоить сэмплы", topic: "mute groups", status: "verified",
    summary: "Объедини сэмплы, которые не должны звучать одновременно (например, закрытый и открытый хэт).",
    steps: [
      { text: "Удерживая [SHIFT], нажми пэд [8] — откроется экран MUTE GROUP.", controls: ["SHIFT"], pads: [8] },
      { text: "Ручкой [VALUE] выбери группу (A–J).", controls: ["VALUE"] },
      { text: "Нажми пэды [1]–[16] с сэмплами, которые войдут в группу.", pads: [] },
      { text: "Нажми [EXIT], чтобы сохранить.", controls: ["EXIT"] },
    ],
    notes: ["Из пэдов одной группы звучит только последний сыгранный.", "Всего до 10 групп (A–J), в группе до 16 сэмплов."],
    sources: [SRC.mute],
  },
  {
    id: "resample-pattern", title: "Resample: превратить паттерн в сэмпл", topic: "resampling", status: "verified",
    summary: "Запиши играющий паттерн как новый сэмпл на пэд — и работай с ним дальше.",
    steps: [
      { text: "Нажми [PATTERN SELECT].", controls: ["PATTERN SELECT"] },
      { text: "Нажми [RESAMPLE].", controls: ["RESAMPLE"] },
      { text: "Нажми [RECORD SETTING] и ручкой [CTRL 2] выставь ROUTING = «Mix».", controls: ["CTRL 2"] },
      { text: "Нажми [EXIT].", controls: ["EXIT"] },
      { text: "Нажми красно мигающий пэд [1]–[16] — сюда сохранится новый сэмпл." },
      { text: "Нажми пэд [1]–[16] паттерна, который хочешь засэмплировать." },
      { text: "Сэмплирование начнётся само, когда паттерн заиграет. [REC] — закончить, [EXIT] — отменить.", controls: ["REC", "EXIT"] },
    ],
    notes: [
      "Пустые пэды мигают красным, пэды с записанным паттерном — синим.",
      "Если ROUTING = «ExtIn», сэмплируется только внешний звук, без собственного звука сэмпла.",
    ],
    sources: [SRC.resample],
  },
  {
    id: "tr-rec", title: "TR-REC: паттерн по шагам", topic: "TR-REC", status: "verified",
    summary: "Построй паттерн так, как в драм-машине: пэды [1]–[16] — это шаги.",
    steps: [
      { text: "Нажми [PATTERN SELECT].", controls: ["PATTERN SELECT"] },
      { text: "Нажми [REC]. Пустые пэды, где нет паттернов, мигают красным.", controls: ["REC"] },
      { text: "Нажми красный пэд [1]–[16] — сюда запишется паттерн. Откроется экран RECORD SETTING." },
      { text: "Нажми [REMAIN] — способ записи переключится на «TR-REC».", controls: ["REMAIN"] },
      { text: "Нажми [REC] — запись TR-REC началась.", controls: ["REC"] },
      { text: "Удерживая [SUB PAD], нажми пэд с нужным сэмплом.", controls: ["SUB PAD"] },
      { text: "Нажми пэды [1]–[16], на которые попадает сэмпл: пэд = шаг (момент) в паттерне.", pads: [1, 5, 9, 13] },
      { text: "Горящие пэды — звучащие шаги. Нажми горящий пэд, чтобы убрать шаг." },
      { text: "Закончив, дважды нажми [EXIT] — паттерн сохранится на пэде.", controls: ["EXIT"] },
    ],
    sources: [SRC.trrec],
  },
  {
    id: "pattern-chain", title: "Pattern Chain: паттерны по порядку", topic: "pattern chaining", status: "verified",
    summary: "Собери из паттернов цепочку и играй её целиком.",
    steps: [
      { text: "Сначала создай паттерны в пэттерн-секвенсоре." },
      { text: "Нажми [PATTERN SELECT].", controls: ["PATTERN SELECT"] },
      { text: "Удерживая [HOLD], нажми пэд [1]–[16] — это номер цепочки.", controls: ["HOLD"] },
      { text: "Нажимай пэды [1]–[16] паттернов в том порядке, в каком они должны звучать." },
      { text: "Нажми [EXIT] — вернёшься на экран PATTERN SELECT, цепочка сохранится сама.", controls: ["EXIT"] },
    ],
    notes: [
      "Паттерны из разных банков добавляются кнопками банков [A/F]–[E/J].",
      "Чтобы воспроизвести: [PATTERN SELECT] → удерживая [HOLD], нажми пэд цепочки → [SUB PAD] запускает и останавливает.",
      "Кнопка [REMAIN] переключает повтор: All / Current / Off.",
    ],
    sources: [SRC.chain],
  },
  // ---- planned topics (no content yet, never shown as lessons) ----
  ...["chopping", "swing", "transitions", "performance FX", "vocal chops", "rolls", "bass-from-sample", "resampling FX", "DJ-style transitions", "SP + mixer workflows"].map<Trick>((t) => ({
    id: t.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title: t, topic: t, status: "todo", summary: "", steps: [], sources: [],
  })),
];

export const PLANNED_TOPICS = TRICKS.filter((t) => t.status === "todo").map((t) => t.topic);
