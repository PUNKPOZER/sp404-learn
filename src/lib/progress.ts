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

// ---- per-lesson completion (Learning Library 2.0). Separate key; the course-level progress above is never touched. ----
const DONE_KEY = "sp404learn.lessonsDone";
let done: Record<string, number> = {};

export function loadDone(): Record<string, number> {
  try { const raw = localStorage.getItem(DONE_KEY); if (raw) done = JSON.parse(raw) as Record<string, number>; } catch { /* in-memory only */ }
  return done;
}
export function markDone(id: string, now = Date.now()): Record<string, number> {
  done = { ...done, [id]: now };
  try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch { /* ignore */ }
  return done;
}
export function unmarkDone(id: string): Record<string, number> {
  const { [id]: _drop, ...rest } = done; void _drop;
  done = rest;
  try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch { /* ignore */ }
  return done;
}
export const isDone = (id: string): boolean => id in done;
/** Share of a course's lessons completed, 0–100. */
export const coursePercent = (lessonIds: string[]): number => (lessonIds.length ? Math.round((lessonIds.filter(isDone).length / lessonIds.length) * 100) : 0);
