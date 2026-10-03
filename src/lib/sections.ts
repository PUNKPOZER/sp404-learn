import type { Section } from "./types";

const BY_LABEL: Record<string, string> = { "ИНТРО": "#5cc8ff", "ДРОП": "#ff7a6b", "БРЕЙК": "#a89bff", "АУТРО": "#ffc15e" };
const BY_CLUSTER: Record<string, string> = { A: "#5ef2c0", B: "#ff6fae", C: "#43d9e3", D: "#ff9a5c" };

/** One colour language for every screen: intro / drop / break / outro have fixed hues, other sections by similarity group. */
export function sectionColor(s: Pick<Section, "label" | "cluster">): string {
  return BY_LABEL[s.label] ?? BY_CLUSTER[s.cluster] ?? "#8d94a8";
}
export const SECTION_LEGEND = [["ИНТРО", BY_LABEL["ИНТРО"]], ["ДРОП", BY_LABEL["ДРОП"]], ["БРЕЙК", BY_LABEL["БРЕЙК"]], ["АУТРО", BY_LABEL["АУТРО"]], ["СЕКЦИЯ", BY_CLUSTER.A]] as const;
export const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
