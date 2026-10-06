// Genre symbols: one idea → one editable SVG (src/assets/genres/*.svg), inlined so currentColor works.
const files = import.meta.glob("../assets/genres/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const ART: Record<string, string> = {};
for (const [path, raw] of Object.entries(files)) ART[path.split("/").pop()!.replace(".svg", "")] = raw;

const INK = "var(--sp-ink)", RED = "var(--sp-red)", BLUE = "var(--sp-blue)", GREEN = "var(--sp-green)";
/** Each genre keeps its assigned identity colour; the rest of the UI is not recoloured per genre. */
export const GENRE_COLOR: Record<string, string> = {
  footwork: RED, jungle: GREEN, ukgarage: BLUE, hiphop: INK, house: RED, techno: INK, breakbeat: RED, ambient: BLUE,
  triphop: INK, lofihouse: GREEN, lofihiphop: BLUE, idm: GREEN, dub: BLUE, dnb: INK,
};
/** Taxonomy genre id (content `course.genre`) → art file id. */
export const GENRE_ART: Record<string, string> = { footwork: "footwork", jungle: "jungle", drum_and_bass: "dnb", uk_garage: "ukgarage", breakbeat: "breakbeat", hip_hop: "hiphop", house: "house", techno: "techno", ambient: "ambient" };
export const hasGenreArt = (id: string) => id in ART;

export function GenreArt({ id, className = "" }: { id: string; className?: string }) {
  const raw = ART[id];
  if (!raw) return null;
  const html = raw.replace("<svg", '<svg aria-hidden="true" focusable="false"');
  return <span className={`genre-art ${className}`} style={{ color: GENRE_COLOR[id] ?? INK }} dangerouslySetInnerHTML={{ __html: html }} />;
}
