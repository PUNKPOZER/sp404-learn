import { useEffect, useRef } from "react";
import type { Section, TrackAnalysis } from "../lib/types";

const SECTION_COLORS = ["#c6ff3d", "#3dd6ff", "#ff6a1a", "#ff3d8b"];

interface Props { peaks: number[][]; analysis: TrackAnalysis | null; currentBar?: number; onBar?: (bar: number) => void; height?: number }

export function Waveform({ peaks, analysis, currentBar, onBar, height = 160 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext("2d")!; g.scale(dpr, dpr);
      const css = getComputedStyle(cv);
      const fg = css.getPropertyValue("--fg") || "#eee", dim = css.getPropertyValue("--line") || "#333", acc = css.getPropertyValue("--acid") || "#c6ff3d";
      g.clearRect(0, 0, w, h);
      const dur = analysis?.duration ?? 1;
      if (analysis) {
        const bar = (60 / analysis.grid.bpm) * 4;
        analysis.sections.forEach((s: Section) => {
          g.fillStyle = SECTION_COLORS["ABCD".indexOf(s.cluster)] + "22";
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
          g.fillStyle = acc + "33"; g.fillRect(x0, 0, (bar / dur) * w, h);
        }
      }
      g.fillStyle = fg.trim() || "#eee";
      const n = peaks.length, mid = h / 2;
      for (let i = 0; i < n; i++) {
        const [lo, hi] = peaks[i];
        const x = (i / n) * w;
        g.fillRect(x, mid - hi * mid * 0.95, Math.max(1, w / n), Math.max(1, (hi - lo) * mid * 0.95));
      }
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(cv);
    return () => ro.disconnect();
  }, [peaks, analysis, currentBar]);

  return (
    <canvas ref={ref} className="waveform" style={{ height }} aria-label="Waveform"
      onClick={(e) => {
        if (!analysis || !onBar) return;
        const r = e.currentTarget.getBoundingClientRect();
        const t = ((e.clientX - r.left) / r.width) * analysis.duration;
        onBar(Math.max(0, Math.floor((t - analysis.grid.origin) / ((60 / analysis.grid.bpm) * 4))));
      }} />
  );
}
