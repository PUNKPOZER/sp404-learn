import { useEffect, useRef } from "react";
import type { StemInfo, TrackAnalysis } from "../lib/types";
import { STEM_COLORS, STEM_LABELS, STEM_ORDER } from "../lib/voices";
import { applyGains, seekStems } from "../lib/audio/stemPlayer";
import { setState, useStore } from "../state/store";

function Lane({ part, info, a, time }: { part: string; info: StemInfo; a: TrackAnalysis; time: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { stemMute, stemSolo } = useStore((s) => s);
  const dim = stemSolo ? stemSolo !== part : stemMute[part];

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext("2d")!; g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
      const bar = (60 / a.grid.bpm) * 4, n = Math.floor((a.duration - a.grid.origin) / bar);
      for (let b = 0; b <= n; b++) {
        if (w / n < 5 && b % 4) continue;
        const x = Math.round(((a.grid.origin + b * bar) / a.duration) * w) + 0.5;
        g.strokeStyle = b % 4 === 0 ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)";
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      }
      g.fillStyle = STEM_COLORS[part];
      const P = info.peaks, mid = h / 2;
      for (let i = 0; i < P.length; i++) {
        const x = (i / P.length) * w, top = mid - Math.min(1, P[i][1]) * mid * 0.92, bot = mid - Math.max(-1, P[i][0]) * mid * 0.92;
        g.fillRect(x, top, Math.max(1, w / P.length), Math.max(1, bot - top));
      }
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(cv); return () => ro.disconnect();
  }, [info, a, part]);

  return (
    <div className={`lane ${dim ? "off" : ""}`} style={{ ["--c" as string]: STEM_COLORS[part] }}>
      <div className="lane-head">
        <b>{STEM_LABELS[part]}</b>
        <div className="lane-btns">
          <button className={`btn xs ${stemMute[part] ? "on" : ""}`} aria-pressed={!!stemMute[part]} onClick={() => { setState((s) => ({ stemMute: { ...s.stemMute, [part]: !s.stemMute[part] } })); applyGains(); }}>M</button>
          <button className={`btn xs ${stemSolo === part ? "on" : ""}`} aria-pressed={stemSolo === part} onClick={() => { setState((s) => ({ stemSolo: s.stemSolo === part ? null : part })); applyGains(); }}>S</button>
        </div>
      </div>
      <div className="lane-body" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekStems(((e.clientX - r.left) / r.width) * a.duration); }}>
        <canvas ref={ref} />
        <i className="playhead" style={{ left: `${(time / a.duration) * 100}%` }} />
      </div>
    </div>
  );
}

export function Stems() {
  const { analysis: a, stemTime, stemLoading } = useStore((s) => s);
  if (!a) return null;
  const have = STEM_ORDER.filter((p) => a.stems[p]);
  if (!have.length) {
    return (
      <div className="screen">
        <header className="screen-head"><h1>Stems</h1></header>
        <section className="panel empty">
          <h2>No stems for this track</h2>
          <p>Stems split the track into <b>drums, bass, lead and vocals</b>. They make drum and bass detection much more reliable.
            The separation model (~80 MB) isn’t downloaded yet — it is fetched once, then everything runs locally.</p>
          <button className="btn primary" onClick={() => setState({ screen: "settings" })}>Open Settings → Model storage</button>
        </section>
      </div>
    );
  }
  const vocal = a.characteristics.vocal_activity;
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Stems</h1>
        <span className="chip">{a.stems_model}</span>
        {vocal != null && <span className="chip soft">vocals in {(vocal * 100).toFixed(0)}% of bars</span>}
        {stemLoading && <span className="mono dim">loading…</span>}
      </header>
      <section className="panel lanes">
        {have.map((p) => <Lane key={p} part={p} info={a.stems[p]} a={a} time={stemTime} />)}
      </section>
      <p className="hint">Press Play to audition the parts together; M mutes, S solos. Click a lane to jump. Stems are your own file, processed and played locally.
        “Lead” is everything that isn’t drums, bass or vocals (keys, guitars, synths, samples).</p>
    </div>
  );
}
