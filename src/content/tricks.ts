import { t } from "../lib/i18n";
import { SRC } from "./sources";
import type { Trick } from "./types";

export const TRICKS: Trick[] = [
  {
    id: "skip-back", title: t("Skip Back: поймать то, что только что сыграл", "Skip Back: catch what you just played"), topic: "skip back", status: "verified",
    summary: t("Сэмплируй звук, который играл до этого, даже если запись не была включена.", "Sample sound that played before, even if recording wasn't on."),
    steps: [
      { text: t("Играй сэмпл или паттерн — или включи [EXT SOURCE] и играй на подключённом инструменте.", "Play a sample or pattern — or turn on [EXT SOURCE] and play a connected instrument."), controls: ["EXT SOURCE"] },
      { text: t("Когда звук превысит уровень триггера, прибор пишет в skip-back память, а кнопка [MARK] мигает.", "When the sound exceeds the trigger level, the unit records into skip-back memory and the [MARK] button blinks.") },
      { text: t("Нажми [MARK]. После надписи «SKIP BACK…» на экране появится волна.", "Press [MARK]. After “SKIP BACK…” appears on the screen, the waveform shows up."), controls: ["MARK"] },
      { text: t("Нажми [REC]. Появится «Select Pad To Save»: пустые пэды мигают красным.", "Press [REC]. “Select Pad To Save” appears: empty pads blink red."), controls: ["REC"] },
      { text: t("Нажми один из пэдов [1]–[16] — аудио из skip-back памяти сохранится на него.", "Press one of pads [1]–[16] — the audio from skip-back memory is saved to it.") },
    ],
    notes: [
      t("По умолчанию хранится до 25 секунд; при параметре Mark Function = «SBS Long» — до 40 секунд.", "Up to 25 seconds are kept by default; with Mark Function = “SBS Long”, up to 40 seconds."),
      t("Если нажать [EXIT] или выключить прибор, не назначив память на пэд, она потеряется.", "If you press [EXIT] or power off without assigning the memory to a pad, it is lost."),
      t("Skip-back и looper одновременно использовать нельзя.", "Skip-back and the looper can't be used at the same time."),
    ],
    sources: [SRC.skipback],
  },
  {
    id: "mute-group", title: t("Mute Group: не слоить сэмплы", "Mute Group: don't layer samples"), topic: "mute groups", status: "verified",
    summary: t("Объедини сэмплы, которые не должны звучать одновременно (например, закрытый и открытый хэт).", "Group samples that shouldn't sound at the same time (for example closed and open hat)."),
    steps: [
      { text: t("Удерживая [SHIFT], нажми пэд [8] — откроется экран MUTE GROUP.", "Holding [SHIFT], press pad [8] — the MUTE GROUP screen opens."), controls: ["SHIFT"], pads: [8] },
      { text: t("Ручкой [VALUE] выбери группу (A–J).", "Use the [VALUE] knob to choose a group (A–J)."), controls: ["VALUE"] },
      { text: t("Нажми пэды [1]–[16] с сэмплами, которые войдут в группу.", "Press pads [1]–[16] with the samples that will join the group."), pads: [] },
      { text: t("Нажми [EXIT], чтобы сохранить.", "Press [EXIT] to save."), controls: ["EXIT"] },
    ],
    notes: [t("Из пэдов одной группы звучит только последний сыгранный.", "Of the pads in one group, only the last one played sounds."), t("Всего до 10 групп (A–J), в группе до 16 сэмплов.", "Up to 10 groups (A–J) in total, up to 16 samples per group.")],
    sources: [SRC.mute],
  },
  {
    id: "resample-pattern", title: t("Resample: превратить паттерн в сэмпл", "Resample: turn a pattern into a sample"), topic: "resampling", status: "verified",
    summary: t("Запиши играющий паттерн как новый сэмпл на пэд — и работай с ним дальше.", "Record the playing pattern as a new sample on a pad — and keep working with it."),
    steps: [
      { text: t("Нажми [PATTERN SELECT].", "Press [PATTERN SELECT]."), controls: ["PATTERN SELECT"] },
      { text: t("Нажми [RESAMPLE].", "Press [RESAMPLE]."), controls: ["RESAMPLE"] },
      { text: t("Нажми [RECORD SETTING] и ручкой [CTRL 2] выставь ROUTING = «Mix».", "Press [RECORD SETTING] and set ROUTING = “Mix” with the [CTRL 2] knob."), controls: ["CTRL 2"] },
      { text: t("Нажми [EXIT].", "Press [EXIT]."), controls: ["EXIT"] },
      { text: t("Нажми красно мигающий пэд [1]–[16] — сюда сохранится новый сэмпл.", "Press the red blinking pad [1]–[16] — the new sample will be saved here.") },
      { text: t("Нажми пэд [1]–[16] паттерна, который хочешь засэмплировать.", "Press the pad [1]–[16] of the pattern you want to resample.") },
      { text: t("Сэмплирование начнётся само, когда паттерн заиграет. [REC] — закончить, [EXIT] — отменить.", "Sampling starts by itself when the pattern starts playing. [REC] finishes, [EXIT] cancels."), controls: ["REC", "EXIT"] },
    ],
    notes: [
      t("Пустые пэды мигают красным, пэды с записанным паттерном — синим.", "Empty pads blink red, pads with a recorded pattern blink blue."),
      t("Если ROUTING = «ExtIn», сэмплируется только внешний звук, без собственного звука сэмпла.", "If ROUTING = “ExtIn”, only the external sound is sampled, without the sample's own sound."),
    ],
    sources: [SRC.resample],
  },
  {
    id: "tr-rec", title: t("TR-REC: паттерн по шагам", "TR-REC: a pattern step by step"), topic: "TR-REC", status: "verified",
    summary: t("Построй паттерн так, как в драм-машине: пэды [1]–[16] — это шаги.", "Build a pattern like on a drum machine: pads [1]–[16] are the steps."),
    steps: [
      { text: t("Нажми [PATTERN SELECT].", "Press [PATTERN SELECT]."), controls: ["PATTERN SELECT"] },
      { text: t("Нажми [REC]. Пустые пэды, где нет паттернов, мигают красным.", "Press [REC]. Empty pads with no patterns blink red."), controls: ["REC"] },
      { text: t("Нажми красный пэд [1]–[16] — сюда запишется паттерн. Откроется экран RECORD SETTING.", "Press a red pad [1]–[16] — the pattern will be recorded here. The RECORD SETTING screen opens.") },
      { text: t("Нажми [REMAIN] — способ записи переключится на «TR-REC».", "Press [REMAIN] — the recording method switches to “TR-REC”."), controls: ["REMAIN"] },
      { text: t("Нажми [REC] — запись TR-REC началась.", "Press [REC] — TR-REC recording has started."), controls: ["REC"] },
      { text: t("Удерживая [SUB PAD], нажми пэд с нужным сэмплом.", "Holding [SUB PAD], press the pad with the sample you need."), controls: ["SUB PAD"] },
      { text: t("Нажми пэды [1]–[16], на которые попадает сэмпл: пэд = шаг (момент) в паттерне.", "Press the pads [1]–[16] where the sample hits: pad = step (moment) in the pattern."), pads: [1, 5, 9, 13] },
      { text: t("Горящие пэды — звучащие шаги. Нажми горящий пэд, чтобы убрать шаг.", "Lit pads are sounding steps. Press a lit pad to remove the step.") },
      { text: t("Закончив, дважды нажми [EXIT] — паттерн сохранится на пэде.", "When done, press [EXIT] twice — the pattern is saved on the pad."), controls: ["EXIT"] },
    ],
    sources: [SRC.trrec],
  },
  {
    id: "pattern-chain", title: t("Pattern Chain: паттерны по порядку", "Pattern Chain: patterns in order"), topic: "pattern chaining", status: "verified",
    summary: t("Собери из паттернов цепочку и играй её целиком.", "Build a chain of patterns and play it through."),
    steps: [
      { text: t("Сначала создай паттерны в пэттерн-секвенсоре.", "First create patterns in the pattern sequencer.") },
      { text: t("Нажми [PATTERN SELECT].", "Press [PATTERN SELECT]."), controls: ["PATTERN SELECT"] },
      { text: t("Удерживая [HOLD], нажми пэд [1]–[16] — это номер цепочки.", "Holding [HOLD], press a pad [1]–[16] — this is the chain number."), controls: ["HOLD"] },
      { text: t("Нажимай пэды [1]–[16] паттернов в том порядке, в каком они должны звучать.", "Press the pads [1]–[16] of the patterns in the order you want them to play.") },
      { text: t("Нажми [EXIT] — вернёшься на экран PATTERN SELECT, цепочка сохранится сама.", "Press [EXIT] — you return to the PATTERN SELECT screen, the chain saves itself."), controls: ["EXIT"] },
    ],
    notes: [
      t("Паттерны из разных банков добавляются кнопками банков [A/F]–[E/J].", "Patterns from other banks are added with the bank buttons [A/F]–[E/J]."),
      t("Чтобы воспроизвести: [PATTERN SELECT] → удерживая [HOLD], нажми пэд цепочки → [SUB PAD] запускает и останавливает.", "To play: [PATTERN SELECT] → holding [HOLD], press the chain pad → [SUB PAD] starts and stops."),
      t("Кнопка [REMAIN] переключает повтор: All / Current / Off.", "The [REMAIN] button switches repeat: All / Current / Off."),
    ],
    sources: [SRC.chain],
  },
  // ---- planned topics (no content yet, never shown as lessons) ----
  ...["chopping", "swing", "transitions", "performance FX", "vocal chops", "rolls", "bass-from-sample", "resampling FX", "DJ-style transitions", "SP + mixer workflows"].map<Trick>((t) => ({
    id: t.toLowerCase().replace(/[^a-z0-9]+/g, "-"), title: t, topic: t, status: "todo", summary: "", steps: [], sources: [],
  })),
];

export const PLANNED_TOPICS = TRICKS.filter((t) => t.status === "todo").map((t) => t.topic);
