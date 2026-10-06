import type { Source } from "../content/types";

/** Where a piece of content was verified. URLs are shown as selectable text (the app makes no network requests). */
export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <details className="sources">
      <summary>Источники ({sources.length})</summary>
      <ul>
        {sources.map((s) => (
          <li key={s.url}><b>{s.title}</b>{s.note ? ` · ${s.note}` : ""}<br /><span className="mono">{s.url}</span><br /><span className="dim">проверено {s.verifiedOn}</span></li>
        ))}
      </ul>
    </details>
  );
}
