import type { Section } from "./types";
import { lang, t } from "./i18n";

const BY_LABEL: Record<string, string> = { "ИНТРО": "#1265F5", "ДРОП": "#FF2A1A", "БРЕЙК": "#718A35", "АУТРО": "#66645D" };
const BY_CLUSTER: Record<string, string> = { A: "#1265F5", B: "#718A35", C: "#FF2A1A", D: "#191918" };

/** One colour language for every screen: intro / drop / break / outro have fixed hues, other sections by similarity group. */
export function sectionColor(s: Pick<Section, "label" | "cluster">): string {
  return BY_LABEL[s.label] ?? BY_CLUSTER[s.cluster] ?? "#66645D";
}
/** Labels are stored (and cached) in Russian by the engine; this shows them in the UI language. */
export function sectionName(label: string): string {
  if (lang !== "en") return label;
  const m: Record<string, string> = { "ИНТРО": "INTRO", "ДРОП": "DROP", "БРЕЙК": "BREAK", "АУТРО": "OUTRO" };
  return m[label] ?? label.replace("СЕКЦИЯ", "SECTION");
}
export const SECTION_LEGEND = [[sectionName("ИНТРО"), BY_LABEL["ИНТРО"]], [sectionName("ДРОП"), BY_LABEL["ДРОП"]], [sectionName("БРЕЙК"), BY_LABEL["БРЕЙК"]], [sectionName("АУТРО"), BY_LABEL["АУТРО"]], [t("СЕКЦИЯ", "SECTION"), BY_CLUSTER.A]] as const;
export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
