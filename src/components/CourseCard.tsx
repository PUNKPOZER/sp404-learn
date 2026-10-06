import type { CourseMeta } from "../lib/types";
import { percent, type CourseProgress } from "../lib/progress";
import { GenreArt } from "./GenreArt";

interface Props { course: CourseMeta; progress?: CourseProgress; onOpen: () => void; onRestart?: () => void }

/** One course = one genre symbol + name + useful descriptor + real progress. */
export function CourseCard({ course, progress, onOpen, onRestart }: Props) {
  const pct = progress ? percent(progress) : 0;
  return (
    <article className="course-card" data-course={course.id}>
      <button className="course-open" onClick={onOpen} aria-label={`${course.title}: ${progress ? `продолжить, ${pct}%` : "начать"}`}>
        <GenreArt id={course.id} className="course-art" />
        <span className="course-title">{course.title}</span>
        <span className="course-short">{course.short}</span>
      </button>
      <div className="course-foot">
        <span className="chip soft">{course.bpm} BPM · {course.lessons.length} уроков</span>
        {progress ? (
          <>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Прогресс курса"><i style={{ width: `${pct}%` }} /></div>
            <div className="course-actions">
              <span className="mono">{pct}% · урок {String(progress.lesson).padStart(2, "0")}</span>
              {onRestart && <button className="link" onClick={onRestart}>с начала</button>}
            </div>
          </>
        ) : <span className="mono dim">Ещё не начат</span>}
      </div>
    </article>
  );
}
