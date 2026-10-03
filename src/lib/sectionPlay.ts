import type { Section } from "./types";
import { toggleAudio } from "./audio/stemPlayer";

export const sectionTag = (i: number) => `sec:${i}`;
/** Play (or stop) one section of the original track, looping it. */
export const toggleSection = (s: Section, i: number) => toggleAudio("mix", { from: s.start, to: s.end, tag: sectionTag(i) });
export const playingSection = (tag: string | null): number | null => (tag?.startsWith("sec:") ? Number(tag.slice(4)) : null);
