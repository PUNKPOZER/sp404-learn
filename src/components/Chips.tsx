import type { Difficulty } from "../content/schema";
import { t } from "../lib/i18n";

const LABEL: Record<Difficulty, [string, string]> = { beginner: ["Новичок", "Beginner"], intermediate: ["Средний", "Intermediate"], advanced: ["Продвинутый", "Advanced"] };

/** Difficulty is never colour-only: the word is always shown. */
export function DifficultyBadge({ level }: { level?: Difficulty }) {
  if (!level) return null;
  return <span className={`chip diff diff-${level}`}>{t(...LABEL[level])}</span>;
}
export function DurationChip({ min }: { min?: number }) {
  return min ? <span className="chip soft mono">{min} {t("мин", "min")}</span> : null;
}
