import type { Section } from "./types";

const BY_LABEL: Record<string, string> = { "ИНТРО": "#1265F5", "ДРОП": "#FF2A1A", "БРЕЙК": "#718A35", "АУТРО": "#66645D" };
const BY_CLUSTER: Record<string, string> = { A: "#1265F5", B: "#718A35", C: "#FF2A1A", D: "#191918" };

/** One colour language for every screen: intro / drop / break / outro have fixed hues, other sections by similarity group. */
export function sectionColor(s: Pick<Section, "label" | "cluster">): string {
  return BY_LABEL[s.label] ?? BY_CLUSTER[s.cluster] ?? "#66645D";
}
export const SECTION_LEGEND = [["ИНТРО", BY_LABEL["ИНТРО"]], ["ДРОП", BY_LABEL["ДРОП"]], ["БРЕЙК", BY_LABEL["БРЕЙК"]], ["АУТРО", BY_LABEL["АУТРО"]], ["СЕКЦИЯ", BY_CLUSTER.A]] as const;
export const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
