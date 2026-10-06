import { t } from "./i18n";
// SP SYSTEM palette only: ink + the three accents. Rows are always labelled, so colour is never the only cue.
const INK = "#191918", RED = "#FF2A1A", BLUE = "#1265F5", GREEN = "#718A35", INK3 = "#66645D";
export const VOICE_COLORS: Record<string, string> = {
  KICK: INK, SNARE: RED, CLAP: RED, CLOSED_HAT: BLUE, OPEN_HAT: BLUE, PERCUSSION: GREEN, UNKNOWN: INK3,
  BASS: INK, VOCAL: GREEN, CHOP: GREEN, FX: BLUE, FILL: RED, TEXTURE: GREEN, RESAMPLE: INK3,
};
export const STEM_COLORS: Record<string, string> = { drums: RED, bass: INK, lead: BLUE, vocals: GREEN };
export const STEM_LABELS: Record<string, string> = { drums: t("УДАРНЫЕ", "DRUMS"), bass: t("БАС", "BASS"), lead: t("ЛИД", "LEAD"), vocals: t("ВОКАЛ", "VOCALS") };
export const STEM_ORDER = ["drums", "bass", "lead", "vocals"];
const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export const VOICE_LABELS: Record<string, string> = {
  KICK: t("БОЧКА", "KICK"), SNARE: t("СНЕЙР", "SNARE"), CLAP: t("КЛЭП", "CLAP"), CLOSED_HAT: t("ХЭТ ЗАКР.", "HAT CL."), OPEN_HAT: t("ХЭТ ОТКР.", "HAT OP."),
  PERCUSSION: t("ПЕРК.", "PERC."), UNKNOWN: t("НЕИЗВ.", "UNKN."), BASS: t("БАС", "BASS"), VOCAL: t("ВОКАЛ", "VOCAL"), CHOP: t("ЧОП", "CHOP"), FX: "FX",
  FILL: t("ФИЛЛ", "FILL"), TEXTURE: t("ТЕКСТУРА", "TEXTURE"), RESAMPLE: t("РЕСЭМПЛ", "RESAMPLE"),
};
export const DRUM_ROWS = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"];
export const PAD_ROWS = [[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]];
export const DEFAULT_KIT: Record<number, string> = {
  1: "KICK", 2: "SNARE", 3: "CLAP", 4: "CLOSED_HAT", 5: "OPEN_HAT", 6: "PERCUSSION", 7: "BASS", 8: "VOCAL",
  9: "CHOP", 10: "CHOP", 11: "CHOP", 12: "CHOP", 13: "FX", 14: "FILL", 15: "TEXTURE", 16: "RESAMPLE",
};
export const ALL_VOICES = Object.keys(VOICE_LABELS).filter((v) => v !== "UNKNOWN");
