import { useState } from "react";
import { DifficultyBadge, DurationChip } from "../components/Chips";
import { Icon } from "../components/Icon";
import { byId, itemsOf, loc } from "../content/load";
import type { Course, Lesson } from "../content/schema";
import { isDone } from "../lib/progress";
import { startLesson } from "../state/actions";
import { useStore } from "../state/store";
import { t } from "../lib/i18n";

export const pathPercent = (c: Course, done: Record<string, number>) =>
  c.lessons.length ? Math.round((c.lessons.filter((id) => id in done).length / c.lessons.length) * 100) : 0;
export const nextLesson = (c: Course, done: Record<string, number>) => c.lessons.find((id) => !(id in done)) ?? null;

/** Learning paths (courses of the Learning Library): beginner → intermediate; lessons open in the shared lesson renderer. */
export function Paths() {
  const { lessonsDone } = useStore((s) => s);
  const courses = itemsOf<Course>("course").sort((a, b) => a.durationMin - b.durationMin).sort((a, b) => ["beginner", "intermediate", "advanced"].indexOf(a.difficulty) - ["beginner", "intermediate", "advanced"].indexOf(b.difficulty));
  const [open, setOpen] = useState<string | null>(courses[0]?.id ?? null);
  void isDone;
  return (
    <div className="paths" data-tour="paths">
      {courses.map((c) => {
        const pct = pathPercent(c, lessonsDone);
        const next = nextLesson(c, lessonsDone);
        const expanded = open === c.id;
        return (
          <section key={c.id} className="panel path-card">
            <header className="path-head">
              <div>
                <h2>{loc(c.title)}</h2>
                <p className="hint">{loc(c.summary)}</p>
                <div className="row"><DifficultyBadge level={c.difficulty} /><DurationChip min={c.durationMin} /><span className="chip soft mono">{c.lessons.length} {t("уроков", "lessons")}</span></div>
              </div>
              <div className="path-side">
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("Прогресс курса", "Course progress")}><i style={{ width: `${pct}%` }} /></div>
                <span className="mono">{pct}%</span>
                {next && <button className="btn primary" onClick={() => startLesson(next)}>{pct ? t("Продолжить", "Continue") : t("Начать", "Start")} <Icon name="arrow" size={16} /></button>}
                <button className="link" onClick={() => setOpen(expanded ? null : c.id)} aria-expanded={expanded}>{expanded ? t("свернуть уроки", "hide lessons") : t("показать уроки", "show lessons")}</button>
              </div>
            </header>
            {expanded && (
              <ol className="path-lessons">
                {c.lessons.map((id, i) => {
                  const l = byId(id) as Lesson | undefined;
                  if (!l) return null;
                  const done = id in lessonsDone;
                  return (
                    <li key={id}>
                      <button onClick={() => startLesson(id)} className={done ? "done" : ""}>
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>
                        <span className="lt"><b>{loc(l.title)}</b><small>{loc(l.summary)}</small></span>
                        <DurationChip min={l.durationMin} />
                        <span className="chk" aria-label={done ? t("пройден", "done") : t("не пройден", "not done")}>{done ? "✓" : ""}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            {expanded && c.finalProject && <p className="hint"><b>{t("Финальный проект", "Final project")}:</b> {loc(c.finalProject)}</p>}
          </section>
        );
      })}
    </div>
  );
}
