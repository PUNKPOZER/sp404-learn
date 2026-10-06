import { useEffect, useMemo, useState } from "react";
import { api, isTauri } from "../lib/sidecar";
import { stopStems, toggleAudio, type PlayMode } from "../lib/audio/stemPlayer";
import { mmss } from "../lib/sections";
import type { TrackAnalysis } from "../lib/types";
import { STEM_COLORS, STEM_LABELS, STEM_ORDER } from "../lib/voices";
import { useStore } from "../state/store";
import { t } from "../lib/i18n";

export interface Region { start: number; end: number }
type Mode = "whole" | "bars" | "phrases" | "hits";
const MODES: [Mode, string, string][] = [
  ["whole", t("Целиком", "Whole"), t("Вся партия одним файлом", "The whole part as one file")],
  ["bars", t("По тактам", "By bars"), t("Равные куски по сетке трека", "Equal pieces on the track grid")],
  ["phrases", t("По фразам", "By phrases"), t("Резать по паузам — удобно для вокала", "Cut at pauses — handy for vocals")],
  ["hits", t("По ударам", "By hits"), t("От одного звука до следующего — для нот и стабов", "From one sound to the next — for notes and stabs")],
];
const DEFAULT_MODE: Record<string, Mode> = { drums: "whole", bass: "whole", lead: "bars", vocals: "phrases" };

interface Props { analysis: TrackAnalysis; part: string; onPart: (p: string) => void; onRegions: (r: Region[], off: Set<number>) => void }

/** Plan how a stem is cut into samples, audition each piece, and write them as SP-404-ready WAV files. */
export function ChopPanel({ analysis: a, part, onPart, onRegions }: Props) {
  const audioTag = useStore((s) => s.audioTag);
  const playing = useStore((s) => s.stemPlaying);
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE[part]);
  const [bars, setBars] = useState(2);
  const [regions, setRegions] = useState<Region[]>([]);
  const [off, setOff] = useState<Set<number>>(new Set());
  const [norm, setNorm] = useState(false);
  const [status, setStatus] = useState<{ kind: "busy" | "ok" | "err"; text: string } | null>(null);

  useEffect(() => { setMode(DEFAULT_MODE[part]); setOff(new Set()); }, [part]);

  useEffect(() => {
    let live = true;
    setStatus(null);
    api.chopPlan({ path: a.stems[part].path, mode, bars, grid: { bpm: a.grid.bpm, origin: a.grid.origin } })
      .then((r) => { if (live) { setRegions(r.regions); setOff(new Set()); } })
      .catch((e) => { if (live) { setRegions([]); setStatus({ kind: "err", text: (e as Error).message }); } });
    return () => { live = false; };
  }, [a, part, mode, bars]);

  useEffect(() => { onRegions(regions, off); }, [regions, off, onRegions]);

  const chosen = useMemo(() => regions.filter((_, i) => !off.has(i)), [regions, off]);
  const base = a.filename.replace(/\.[^.]+$/, "");

  async function pickDir(): Promise<string | null> {
    if (!isTauri) return "/tmp/sp404learn-export";
    const { open } = await import("@tauri-apps/plugin-dialog");
    const p = await open({ directory: true, multiple: false, title: t("Куда сохранить сэмплы для SP-404", "Where to save the samples for SP-404") });
    return typeof p === "string" ? p : null;
  }
  async function run(jobs: { part: string; regions: Region[] }[]) {
    const dir = await pickDir();
    if (!dir) return;
    setStatus({ kind: "busy", text: t("Сохраняю…", "Saving…") });
    try {
      const out = `${dir}/${base}_stems`;
      let n = 0;
      for (const j of jobs) {
        const r = await api.exportChops({ path: a.stems[j.part].path, regions: j.regions, outdir: out, basename: `${base}_${j.part}`, normalize: norm });
        n += r.files.length;
      }
      setStatus({ kind: "ok", text: t(t(`Готово: ${n} файл(ов) в папке ${out}`, `Done: ${n} file(s) in ${out}`), `Done: ${n} file(s) in ${out}`) });
    } catch (e) { setStatus({ kind: "err", text: (e as Error).message }); }
  }

  const audition = (i: number) => {
    const r = regions[i];
    void toggleAudio(part as PlayMode, { from: r.start, to: r.end, tag: `chop:${part}:${i}` });
  };

  return (
    <section className="panel chop" data-tour="chop">
      <h2>{t("Выгрузка для SP-404MKII", "Export for SP-404MKII")} <small>{t("WAV · 16 бит · 48 кГц · моно", "WAV · 16-bit · 48 kHz · mono")}</small></h2>
      <div className="chop-parts">
        {STEM_ORDER.filter((p) => a.stems[p]).map((p) => (
          <button key={p} className={`btn ${part === p ? "on" : ""}`} style={{ ["--c" as string]: STEM_COLORS[p] }} onClick={() => { stopStems(); onPart(p); }}>
            <i className="dot" style={{ background: STEM_COLORS[p] }} />{STEM_LABELS[p]}</button>
        ))}
      </div>
      <div className="chop-modes">
        {MODES.map(([m, label, hint]) => (
          <button key={m} className={`btn sm ${mode === m ? "on" : ""}`} title={hint} onClick={() => setMode(m)}>{label}</button>
        ))}
        {mode === "bars" && (
          <label className="inline">{t("такта в куске", "bars per piece")}
            <select value={bars} onChange={(e) => setBars(+e.target.value)}>{[1, 2, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        )}
        <label className="inline"><input type="checkbox" checked={norm} onChange={(e) => setNorm(e.target.checked)} /> {t("выровнять громкость (−1 дБ)", "normalize level (−1 dB)")}</label>
      </div>
      <p className="hint" style={{ margin: "0 0 10px" }}>{MODES.find((m) => m[0] === mode)![2]}. {t("Найдено кусков", "Pieces found")}: <b>{regions.length}</b>, {t("в выгрузку пойдёт", "to export")} <b>{chosen.length}</b>. {t("Сними галочку у лишнего; ▶ — послушать кусок.", "Untick what you don't need; ▶ plays a piece.")}</p>
      {regions.length > 0 && mode !== "whole" && (
        <div className="chop-list">
          {regions.map((r, i) => {
            const on = playing && audioTag === `chop:${part}:${i}`;
            return (
              <div key={i} className={`chop-item ${off.has(i) ? "off" : ""}`}>
                <input type="checkbox" checked={!off.has(i)} aria-label={`${t("Кусок", "Piece")} ${i + 1}`}
                  onChange={() => setOff((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
                <b className="mono">{String(i + 1).padStart(2, "0")}</b>
                <button className="btn xs" onClick={() => audition(i)}>{on ? "■" : "▶"}</button>
                <span className="mono dim">{mmss(r.start)} · {(r.end - r.start).toFixed(1)} {t("с", "s")}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="chop-actions">
        <button className="btn primary" disabled={!chosen.length || status?.kind === "busy"} onClick={() => run([{ part, regions: chosen }])}>
          {mode === "whole" ? t(`Сохранить ${STEM_LABELS[part].toLowerCase()} одним файлом`, `Save ${STEM_LABELS[part].toLowerCase()} as one file`) : t(`Сохранить ${chosen.length} кусков`, `Save ${chosen.length} pieces`)}…</button>
        <button className="btn" disabled={status?.kind === "busy"} title={t("Все четыре партии целиком, по одному файлу", "All four parts whole, one file each")}
          onClick={() => run(STEM_ORDER.filter((p) => a.stems[p]).map((p) => ({ part: p, regions: [{ start: 0, end: a.stems[p].duration }] })))}>{t("Все партии целиком…", "All parts whole…")}</button>
      </div>
      {status && <div className={`chop-status ${status.kind}`}>{status.text}</div>}
    </section>
  );
}
