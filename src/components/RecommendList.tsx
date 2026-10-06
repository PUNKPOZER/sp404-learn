import { useMemo } from "react";
import { byId } from "../content/load";
import type { Course } from "../content/schema";
import { genreName } from "../lib/genres";
import { t } from "../lib/i18n";
import { recommend } from "../lib/recommend";
import { pathPercent } from "../screens/Paths";
import { openLibraryItem } from "../state/actions";
import { type Screen, useStore } from "../state/store";

const KIND: Record<string, [string, string]> = { lesson: ["Урок", "Lesson"], trick: ["Приём", "Trick"], fx: ["Эффект", "FX"], exercise: ["Практика", "Practice"], course: ["Курс", "Course"] };

/** Recommendations for a genre (or the beginner path when genre is null). Re-ranks the moment the genre changes. */
export function RecommendList({ genre, back, limit = 5 }: { genre: string | null; back: Screen; limit?: number }) {
  const done = useStore((s) => s.lessonsDone);
  const recs = useMemo(() => {
    const zero = byId("sp404-from-zero") as Course | undefined;
    return recommend(genre, done, { limit, fundamentals: zero ? pathPercent(zero, done) : 100 });
  }, [genre, done, limit]);
  if (!recs.length) return null;
  return (
    <section className="panel rec-list" aria-label={t("Рекомендации", "Recommended")} data-tour="recommended">
      <h2>{t("Рекомендуем", "Recommended")} <small>{genre ? genreName(genre) : t("для начала", "to get started")}</small></h2>
      <ul className="search-list">
        {recs.map((r) => (
          <li key={r.id}><button className="search-row" onClick={() => openLibraryItem(r.type, r.id, back)}>
            <b>{r.done ? "✓ " : ""}{r.title}</b><span className="dim">{t(...KIND[r.type])} · {r.reason}</span>
          </button></li>
        ))}
      </ul>
    </section>
  );
}
