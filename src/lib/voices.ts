export const VOICE_COLORS: Record<string, string> = {
  KICK: "#ff7a6b", SNARE: "#ff6fae", CLAP: "#ffc15e", CLOSED_HAT: "#5cc8ff", OPEN_HAT: "#5ef2c0",
  PERCUSSION: "#a89bff", UNKNOWN: "#8b91a3", BASS: "#ff9a5c", VOCAL: "#ff6fae", CHOP: "#5ef2c0",
  FX: "#5cc8ff", FILL: "#ffc15e", TEXTURE: "#a89bff", RESAMPLE: "#8b91a3",
};
export const STEM_COLORS: Record<string, string> = { drums: "#ff7a6b", bass: "#ff9a5c", lead: "#a89bff", vocals: "#ff6fae" };
export const STEM_LABELS: Record<string, string> = { drums: "УДАРНЫЕ", bass: "БАС", lead: "ЛИД", vocals: "ВОКАЛ" };
export const STEM_ORDER = ["drums", "bass", "lead", "vocals"];
const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export const VOICE_LABELS: Record<string, string> = {
  KICK: "БОЧКА", SNARE: "СНЕЙР", CLAP: "КЛЭП", CLOSED_HAT: "ХЭТ ЗАКР.", OPEN_HAT: "ХЭТ ОТКР.",
  PERCUSSION: "ПЕРК.", UNKNOWN: "НЕИЗВ.", BASS: "БАС", VOCAL: "ВОКАЛ", CHOP: "ЧОП", FX: "FX",
  FILL: "ФИЛЛ", TEXTURE: "ТЕКСТУРА", RESAMPLE: "РЕСЭМПЛ",
};
export const DRUM_ROWS = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"];
export const PAD_ROWS = [[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]];
export const DEFAULT_KIT: Record<number, string> = {
  1: "KICK", 2: "SNARE", 3: "CLAP", 4: "CLOSED_HAT", 5: "OPEN_HAT", 6: "PERCUSSION", 7: "BASS", 8: "VOCAL",
  9: "CHOP", 10: "CHOP", 11: "CHOP", 12: "CHOP", 13: "FX", 14: "FILL", 15: "TEXTURE", 16: "RESAMPLE",
};
export const ALL_VOICES = Object.keys(VOICE_LABELS).filter((v) => v !== "UNKNOWN");
