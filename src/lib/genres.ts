import { t } from "./i18n";

/** Taxonomy ids (python/bench/taxonomy.py, engine/genre/fusion.py) → display names. */
export const GENRE_NAMES: Record<string, string> = {
  footwork: "Footwork / Juke", juke: "Juke", jungle: "Jungle", drum_and_bass: "Drum & Bass", breakbeat: "Breakbeat",
  uk_garage: "UK Garage", bassline: "Bassline", two_step: "2-Step", house: "House", deep_house: "Deep House", acid_house: "Acid House",
  techno: "Techno", acid_techno: "Acid Techno", hip_hop: "Hip-Hop", boom_bap: "Boom Bap", instrumental_hip_hop: "Instrumental Hip-Hop",
  ambient: "Ambient", idm: "IDM", dub: "Dub", dubstep: "Dubstep", trip_hop: "Trip-Hop",
};
export const genreName = (id: string | null | undefined) => (id ? GENRE_NAMES[id] ?? id : t("не определён", "undetermined"));
/** Genres a user may pick when correcting (main labels only). */
export const CORRECTABLE = ["footwork", "jungle", "drum_and_bass", "uk_garage", "breakbeat", "house", "techno", "hip_hop", "ambient", "idm", "dub", "dubstep", "trip_hop"];

export const STATUS_TEXT = (s: string) => s === "confident" ? t("Скорее всего", "Most likely") : s === "hybrid" ? t("Гибрид / неуверенно", "Hybrid / uncertain") : t("Жанр неясен", "Genre unclear");
