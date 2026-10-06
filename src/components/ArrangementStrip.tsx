import { mmss, sectionColor, sectionName } from "../lib/sections";
import type { Recipe, TrackAnalysis } from "../lib/types";
import { useStore } from "../state/store";
import { t } from "../lib/i18n";

interface Props {
  analysis: TrackAnalysis;
  recipe?: Recipe | null;
  /** pattern whose sections should stand out (Recipe screen) */
  activePattern?: string | null;
  onPick?: (index: number) => void;
  playingIndex?: number | null;
  showPlay?: boolean;
  height?: number;
}

/** The song as colored blocks (width = duration): INTRO / DROP / BREAK / OUTRO / SECTION, each tagged with its pattern. */
export function SectionStrip({ analysis, recipe, activePattern, onPick, playingIndex, showPlay, height = 74 }: Props) {
  const time = useStore((s) => s.stemTime);
  const total = analysis.sections.reduce((m, s) => Math.max(m, s.end), 0) || analysis.duration;
  return (
    <div className="arr-track" style={{ height }} role="list">
      {analysis.sections.map((s, i) => {
        const pat = recipe?.arrangement[i]?.pattern;
        const playing = playingIndex === i;
        const dim = activePattern != null && pat !== activePattern;
        const prog = playing ? Math.min(1, Math.max(0, (time - s.start) / (s.end - s.start))) : 0;
        return (
          <button key={i} role="listitem" className={`arr-seg ${playing ? "playing" : ""} ${dim ? "dim" : ""} ${(s.end - s.start) / total < 0.07 ? "tiny" : ""} ${activePattern && !dim ? "on" : ""}`}
            style={{ flexGrow: Math.max(0.08, (s.end - s.start) / total), flexBasis: 0, ["--c" as string]: sectionColor(s) }}
            onClick={() => onPick?.(i)} title={`${sectionName(s.label)} · ${mmss(s.start)}–${mmss(s.end)} · ${t("такты","bars")} ${s.start_bar + 1}–${s.end_bar}`}>
            {playing && <i className="arr-prog" style={{ width: `${prog * 100}%` }} />}
            <span className="arr-top"><span className="arr-name">{showPlay ? (playing ? "■ " : "▶ ") : ""}{sectionName(s.label)}</span>{pat && <span className="arr-pat">{pat}</span>}</span>
            <span className="arr-time">{mmss(s.start)} – {mmss(s.end)}</span>
          </button>
        );
      })}
    </div>
  );
}
