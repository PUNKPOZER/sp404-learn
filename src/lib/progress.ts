// Real lesson progress, persisted locally (localStorage; works without it in-memory). Never leaves the device.
export interface CourseProgress {
  courseId: string;
  /** step the learner is on */
  index: number;
  /** furthest step reached (drives the percentage) */
  furthest: number;
  total: number;
  lesson: number;
  lessons: number;
  lessonTitle: string;
  updated: number;
}

const KEY = "sp404learn.progress";
let memory: Record<string, CourseProgress> = {};

export function loadProgress(): Record<string, CourseProgress> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) memory = JSON.parse(raw) as Record<string, CourseProgress>;
  } catch { /* storage unavailable or corrupt: keep in-memory copy */ }
  return memory;
}

export function saveProgress(p: Omit<CourseProgress, "updated" | "furthest"> & { furthest?: number }, now = Date.now()): Record<string, CourseProgress> {
  const prev = memory[p.courseId];
  memory = { ...memory, [p.courseId]: { ...p, furthest: Math.max(p.furthest ?? 0, p.index, prev?.furthest ?? 0), updated: now } };
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* ignore */ }
  return memory;
}

export function resetProgress(courseId: string): Record<string, CourseProgress> {
  const { [courseId]: _drop, ...rest } = memory; void _drop;
  memory = rest;
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* ignore */ }
  return memory;
}

export const percent = (p: Pick<CourseProgress, "furthest" | "total">): number =>
  p.total > 0 ? Math.min(100, Math.round(((p.furthest + 1) / p.total) * 100)) : 0;

export function latest(all: Record<string, CourseProgress>): CourseProgress | null {
  const list = Object.values(all);
  return list.length ? list.reduce((a, b) => (b.updated > a.updated ? b : a)) : null;
}
