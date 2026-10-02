export const VOICE_COLORS: Record<string, string> = {
  KICK: "#ff6a1a", SNARE: "#ff3d8b", CLAP: "#ffb020", CLOSED_HAT: "#3dd6ff", OPEN_HAT: "#c6ff3d",
  PERCUSSION: "#b79cff", UNKNOWN: "#8a8a8a", BASS: "#ff6a1a", VOCAL: "#ff3d8b", CHOP: "#c6ff3d",
  FX: "#3dd6ff", FILL: "#ffb020", TEXTURE: "#b79cff", RESAMPLE: "#8a8a8a",
};
export const VOICE_LABELS: Record<string, string> = {
  KICK: "KICK", SNARE: "SNARE", CLAP: "CLAP", CLOSED_HAT: "CLOSED HAT", OPEN_HAT: "OPEN HAT",
  PERCUSSION: "PERC", UNKNOWN: "UNKNOWN", BASS: "BASS", VOCAL: "VOCAL", CHOP: "CHOP", FX: "FX",
  FILL: "FILL", TEXTURE: "TEXTURE", RESAMPLE: "RESAMPLE",
};
export const DRUM_ROWS = ["KICK", "SNARE", "CLAP", "CLOSED_HAT", "OPEN_HAT", "PERCUSSION"];
export const PAD_ROWS = [[13, 14, 15, 16], [9, 10, 11, 12], [5, 6, 7, 8], [1, 2, 3, 4]];
export const DEFAULT_KIT: Record<number, string> = {
  1: "KICK", 2: "SNARE", 3: "CLAP", 4: "CLOSED_HAT", 5: "OPEN_HAT", 6: "PERCUSSION", 7: "BASS", 8: "VOCAL",
  9: "CHOP", 10: "CHOP", 11: "CHOP", 12: "CHOP", 13: "FX", 14: "FILL", 15: "TEXTURE", 16: "RESAMPLE",
};
export const ALL_VOICES = Object.keys(VOICE_LABELS).filter((v) => v !== "UNKNOWN");
