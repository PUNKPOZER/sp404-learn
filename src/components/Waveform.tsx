import { useEffect, useRef } from "react";
import { sectionColor } from "../lib/sections";
import type { Section, TrackAnalysis } from "../lib/types";

interface Props { peaks: number[][]; analysis: TrackAnalysis | null; currentBar?: number; onBar?: (bar: number) => void; onSeek?: (t: number) => void; playTime?: number | null; height?: number;
  /** time marks (s) drawn as ticks, e.g. where each bass note starts */ markers?: number[]; markerColor?: string }

export function Waveform({ peaks, analysis, currentBar, onBar, onSeek, playTime, height = 160, markers, markerColor = "#ff9a5c" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext("2d")!; g.scale(dpr, dpr);
      const css = getComputedStyle(cv);
      const fg = css.getPropertyValue("--fg") || "#eee", dim = css.getPropertyValue("--line") || "#333";
      g.clearRect(0, 0, w, h);
      const dur = analysis?.duration ?? 1;
      if (analysis) {
        const bar = (60 / analysis.grid.bpm) * 4;
        analysis.sections.forEach((s: Section) => {
          g.fillStyle = sectionColor(s) + "26";
          g.fillRect((s.start / dur) * w, 0, ((s.end - s.start) / dur) * w, h);
        });
        const nBars = Math.floor((dur - analysis.grid.origin) / bar);
        for (let b = 0; b <= nBars; b++) {
          const x = ((analysis.grid.origin + b * bar) / dur) * w;
          g.strokeStyle = b % 4 === 0 ? "#555" : dim; g.lineWidth = 1;
          if (w / nBars > 4 || b % 4 === 0) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
        }
        if (currentBar != null) {
          const x0 = ((analysis.grid.origin + currentBar * bar) / dur) * w;
          g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x0, 0, Math.max(3, (bar / dur) * w), h); g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(x0 + 1, 1, Math.max(3, (bar / dur) * w) - 2, h - 2);
        }
      }
      g.fillStyle = fg.trim() || "#eee";
      const n = peaks.length, mid = h / 2;
      for (let i = 0; i < n; i++) {
        const [lo, hi] = peaks[i];
        const x = (i / n) * w;
        g.fillRect(x, mid - hi * mid * 0.95, Math.max(1, w / n), Math.max(1, (hi - lo) * mid * 0.95));
      }
      if (markers && analysis) {
        g.fillStyle = markerColor;
        for (const m of markers) g.fillRect(Math.round((m / dur) * w) - 1, 0, 2, h);
      }
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(cv);
    return () => ro.disconnect();
  }, [peaks, analysis, currentBar, markers, markerColor]);

  return (
    <div className="wave-wrap" data-tour="waveform">
      <canvas ref={ref} className="waveform" style={{ height }} aria-label="Волна"
        onClick={(e) => {
          if (!analysis) return;
          const r = e.currentTarget.getBoundingClientRect();
          const t = ((e.clientX - r.left) / r.width) * analysis.duration;
          onSeek?.(t);
          onBar?.(Math.max(0, Math.floor((t - analysis.grid.origin) / ((60 / analysis.grid.bpm) * 4))));
        }} />
      {playTime != null && analysis && <i className="playhead" style={{ left: `${(playTime / analysis.duration) * 100}%` }} />}
    </div>
  );
}
