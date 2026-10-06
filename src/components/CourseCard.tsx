import type { CourseMeta } from "../lib/types";
import { percent, type CourseProgress } from "../lib/progress";
import { GenreArt } from "./GenreArt";
import { t } from "../lib/i18n";
import { Icon } from "./Icon";

interface Props { course: CourseMeta; index: number; progress?: CourseProgress; onOpen: () => void; onRestart?: () => void }

const WAVE = <svg className="gc-wave" viewBox="0 0 24 16" width="22" height="15" aria-hidden><path d="M2 5v6M6 2v12M10 4v8M14 1v14M18 4v8M22 6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" fill="none" /></svg>;

/** One course = one cover card: number, genre symbol, name + arrow, real progress (as on the SP SYSTEM board). */
export function CourseCard({ course, index, progress, onOpen, onRestart }: Props) {
  const pct = progress ? percent(progress) : 0;
  return (
    <article className="genre-card" data-course={course.id}>
      <button className="gc-open" onClick={onOpen} aria-label={`${course.title}: ${progress ? `${t("продолжить","continue")}, ${pct}%` : t("начать","start")}`}>
        <span className="gc-top"><span className="gc-num mono">{String(index + 1).padStart(2, "0")}</span><i className="gc-dash" />{WAVE}</span>
        <GenreArt id={course.id} className="gc-art" />
        <span className="gc-name"><b>{course.title.split(" / ")[0]}</b><Icon name="up-right" size={20} /></span>
      </button>
      <div className="gc-foot">
        <span className="gc-short">{course.short}</span>
        <span className="chip soft">{course.bpm} BPM · {course.lessons.length} {t("уроков","lessons")}</span>
        {progress ? (
          <>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("Прогресс курса","Course progress")}><i style={{ width: `${pct}%` }} /></div>
            <div className="course-actions">
              <span className="mono">{pct}% · {t("урок","lesson")} {String(progress.lesson).padStart(2, "0")}</span>
              {onRestart && <button className="link" onClick={onRestart}>{t("с начала","restart")}</button>}
            </div>
          </>
        ) : <span className="mono dim">{t("Ещё не начат","Not started")}</span>}
      </div>
    </article>
  );
}
