import type { ExplainCard as Card } from "../lib/explain";
import { t } from "../lib/i18n";

const LEVEL: Record<Card["level"], [string, string]> = { high: ["уверенно", "confident"], medium: ["скорее всего", "likely"], low: ["не уверен", "not sure"] };

/** One plain-language finding: headline, what it means, one thing to try; numbers stay under DETAILS. Confidence is always a word, never colour alone. */
export function ExplainCard({ card, onLearn, onAlt }: { card: Card; onLearn?: (l: NonNullable<Card["learn"]>[number]) => void; onAlt?: (bpm: number) => void }) {
  return (
    <article className={`panel explain explain-${card.level}`} data-card={card.id}>
      <header className="explain-head"><h2>{card.headline}</h2><span className={`chip lvl lvl-${card.level}`}>{t(...LEVEL[card.level])}</span></header>
      <p>{card.body}</p>
      {card.level === "low" && <p className="hint">{t("Считай это подсказкой и проверь на слух.", "Treat this as a hint and check it by ear.")}</p>}
      {card.tryThis && <p className="try"><b>{t("Попробуй", "Try this")}:</b> {card.tryThis}</p>}
      <div className="row">
        {card.altBpm && onAlt && <button className="btn sm" onClick={() => onAlt(card.altBpm!)}>{t("Взять", "Use")} {card.altBpm} BPM</button>}
        {card.learn?.map((l) => <button key={l.id} className="btn sm" onClick={() => onLearn?.(l)}>{t("Подробнее →", "Learn more →")}</button>)}
      </div>
      {card.details.length > 0 && (
        <details className="explain-details"><summary>{t("Подробности", "Details")}</summary>
          <table className="kv"><tbody>{card.details.map(([k, v], i) => <tr key={i}><td>{k}</td><td className="mono">{v}</td></tr>)}</tbody></table>
        </details>
      )}
    </article>
  );
}
